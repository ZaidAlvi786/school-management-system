"""
Enhanced Face Recognition Service with quality checks and improved accuracy
Uses face_recognition library (dlib-based) with production-grade improvements
"""

import face_recognition
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
import logging
import cv2
from typing import Optional, Tuple, List, Dict
from scipy.spatial.distance import cosine

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """
    Enhanced face recognition service with:
    - Image quality validation (blur, lighting, face size)
    - Image preprocessing (resize, normalization)
    - Improved matching with confidence scores
    - Better error handling
    """
    
    def __init__(self, tolerance: float = 0.5, min_face_size: int = 100):
        """
        Initialize face recognition service
        
        Args:
            tolerance: Face matching tolerance (lower = more strict)
                      Recommended: 0.4-0.6 for production
            min_face_size: Minimum face size in pixels (width or height)
        """
        self.tolerance = tolerance
        self.min_face_size = min_face_size
        logger.info(f"FaceRecognitionService initialized: tolerance={tolerance}, min_face_size={min_face_size}")
    
    def decode_base64_image(self, base64_string: str) -> Image.Image:
        """
        Decode base64 image string to PIL Image with validation
        
        Args:
            base64_string: Base64 encoded image (with or without data URL prefix)
            
        Returns:
            PIL Image object (RGB mode)
        """
        try:
            # Remove data URL prefix if present
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")
            
            # Validate image size
            if image.size[0] < 100 or image.size[1] < 100:
                raise ValueError("Image too small. Minimum size: 100x100 pixels")
            
            if image.size[0] > 5000 or image.size[1] > 5000:
                raise ValueError("Image too large. Maximum size: 5000x5000 pixels")
            
            return image
        
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise ValueError(f"Invalid image format: {str(e)}")
    
    def check_image_quality(self, image: Image.Image) -> Dict[str, any]:
        """
        Check image quality metrics
        
        Args:
            image: PIL Image object
            
        Returns:
            Dict with quality metrics and warnings
        """
        try:
            # Convert to numpy array for OpenCV
            img_array = np.array(image)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            
            # Calculate blur using Laplacian variance
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            is_blurry = laplacian_var < 100  # Threshold for blur detection
            
            # Calculate brightness (mean pixel value)
            brightness = np.mean(gray)
            is_dark = brightness < 50
            is_bright = brightness > 200
            
            # Calculate contrast (standard deviation)
            contrast = np.std(gray)
            is_low_contrast = contrast < 20
            
            quality_score = 100.0
            warnings = []
            
            if is_blurry:
                quality_score -= 30
                warnings.append("Image appears blurry")
            
            if is_dark:
                quality_score -= 20
                warnings.append("Image is too dark")
            elif is_bright:
                quality_score -= 15
                warnings.append("Image is too bright")
            
            if is_low_contrast:
                quality_score -= 15
                warnings.append("Low contrast detected")
            
            return {
                "quality_score": quality_score,
                "is_blurry": is_blurry,
                "brightness": float(brightness),
                "contrast": float(contrast),
                "warnings": warnings,
                "laplacian_variance": float(laplacian_var)
            }
        
        except Exception as e:
            logger.warning(f"Error checking image quality: {str(e)}")
            return {
                "quality_score": 50.0,
                "is_blurry": False,
                "brightness": 128.0,
                "contrast": 50.0,
                "warnings": ["Could not analyze image quality"],
                "laplacian_variance": 0.0
            }
    
    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better face detection:
        - Resize if too large (max 1000px on longest side)
        - Enhance contrast if needed
        - Normalize lighting
        
        Args:
            image: PIL Image object
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            # Resize if too large (improves speed and memory)
            max_size = 1000
            width, height = image.size
            
            if width > max_size or height > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(height * (max_size / width))
                else:
                    new_height = max_size
                    new_width = int(width * (max_size / height))
                
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
                logger.debug(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Enhance contrast slightly (helps with face detection)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.1)  # 10% contrast boost
            
            return image
        
        except Exception as e:
            logger.warning(f"Error preprocessing image: {str(e)}")
            return image  # Return original if preprocessing fails
    
    def detect_face(self, image: Image.Image, require_single: bool = True) -> Optional[Tuple[np.ndarray, Dict]]:
        """
        Detect and encode face from image with quality checks
        
        Args:
            image: PIL Image object
            require_single: If True, reject images with multiple faces
            
        Returns:
            Tuple of (face_encoding, metadata) or None if no face detected
            Metadata includes: face_location, quality_info
        """
        try:
            # Preprocess image
            processed_image = self.preprocess_image(image)
            
            # Convert PIL Image to numpy array
            image_array = np.array(processed_image)
            
            # Use HOG model for faster detection (can switch to CNN for better accuracy)
            # model='hog' is faster, model='cnn' is more accurate but slower
            face_locations = face_recognition.face_locations(
                image_array, 
                model='hog',  # Use 'cnn' for better accuracy if speed is not critical
                number_of_times_to_upsample=1
            )
            
            if len(face_locations) == 0:
                logger.warning("No face detected in image")
                return None
            
            if len(face_locations) > 1 and require_single:
                logger.warning(f"Multiple faces detected ({len(face_locations)}). Only one face allowed.")
                return None
            
            # Get the largest face if multiple detected (but require_single=False)
            if len(face_locations) > 1:
                # Calculate face sizes and pick largest
                face_sizes = [(top - bottom) * (right - left) for top, right, bottom, left in face_locations]
                largest_idx = np.argmax(face_sizes)
                face_locations = [face_locations[largest_idx]]
                logger.info(f"Multiple faces detected, using largest face")
            
            # Get face encoding
            face_encodings = face_recognition.face_encodings(image_array, face_locations, num_jitters=1)
            
            if len(face_encodings) == 0:
                logger.warning("Could not generate face encoding")
                return None
            
            # Get face location for size validation
            top, right, bottom, left = face_locations[0]
            face_width = right - left
            face_height = bottom - top
            face_size = max(face_width, face_height)
            
            # Validate face size
            if face_size < self.min_face_size:
                logger.warning(f"Face too small: {face_size}px (minimum: {self.min_face_size}px)")
                return None
            
            # Check image quality
            quality_info = self.check_image_quality(processed_image)
            
            # Warn if quality is poor but don't reject (let matching decide)
            if quality_info["quality_score"] < 50:
                logger.warning(f"Poor image quality detected: {quality_info['warnings']}")
            
            metadata = {
                "face_location": face_locations[0],
                "face_size": face_size,
                "quality": quality_info
            }
            
            return face_encodings[0], metadata
        
        except Exception as e:
            logger.error(f"Error detecting face: {str(e)}")
            raise ValueError(f"Face detection failed: {str(e)}")
    
    def generate_encoding(self, base64_image: str) -> Tuple[List[float], Dict]:
        """
        Generate face encoding from base64 image with quality validation
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Tuple of (face_encoding, metadata)
            face_encoding: List of floats (128 dimensions)
            metadata: Dict with quality and detection info
        """
        image = self.decode_base64_image(base64_image)
        result = self.detect_face(image)
        
        if result is None:
            raise ValueError(
                "No face detected in image. Please ensure:\n"
                "- Exactly one face is visible\n"
                "- Face is clearly visible and not blurry\n"
                "- Good lighting conditions\n"
                "- Face is at least 100x100 pixels"
            )
        
        encoding, metadata = result
        return encoding.tolist(), metadata
    
    def compare_faces(
        self, 
        known_encoding: List[float], 
        unknown_encoding: List[float]
    ) -> Tuple[bool, float, float]:
        """
        Compare two face encodings with improved metrics
        
        Args:
            known_encoding: Known face encoding (list of floats)
            unknown_encoding: Unknown face encoding (list of floats)
            
        Returns:
            Tuple of (match: bool, similarity: float, distance: float)
            similarity: 0-1, higher = more similar
            distance: Euclidean distance (lower = more similar)
        """
        try:
            known_array = np.array(known_encoding, dtype=np.float64)
            unknown_array = np.array(unknown_encoding, dtype=np.float64)
            
            # Normalize encodings (L2 normalization)
            known_norm = known_array / (np.linalg.norm(known_array) + 1e-10)
            unknown_norm = unknown_array / (np.linalg.norm(unknown_array) + 1e-10)
            
            # Calculate Euclidean distance
            euclidean_distance = np.linalg.norm(known_norm - unknown_norm)
            
            # Calculate cosine similarity (alternative metric)
            cosine_sim = 1 - cosine(known_array, unknown_array)
            
            # Use Euclidean distance for matching (face_recognition standard)
            match = euclidean_distance <= self.tolerance
            
            # Convert distance to similarity score (0-1, higher = more similar)
            # Invert and normalize: similarity = 1 - (distance / max_distance)
            # Max distance for normalized vectors is ~2.0
            similarity = max(0.0, min(1.0, 1.0 - (euclidean_distance / 2.0)))
            
            logger.debug(
                f"Face comparison: match={match}, "
                f"euclidean_distance={euclidean_distance:.4f}, "
                f"cosine_similarity={cosine_sim:.4f}, "
                f"similarity_score={similarity:.4f}"
            )
            
            return match, float(similarity), float(euclidean_distance)
        
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            raise ValueError(f"Face comparison failed: {str(e)}")
    
    def find_matching_user(
        self, 
        unknown_encoding: List[float], 
        all_encodings: List[dict],
        min_confidence: float = 0.5
    ) -> Optional[dict]:
        """
        Find matching user from list of encodings with confidence threshold
        
        Args:
            unknown_encoding: Face encoding to match
            all_encodings: List of dicts with 'user_id' and 'encoding' keys
            min_confidence: Minimum similarity score to consider a match (0-1)
            
        Returns:
            Matching user dict with user_id, similarity, distance, or None
        """
        best_match = None
        best_similarity = 0.0
        best_distance = float('inf')
        
        for encoding_data in all_encodings:
            try:
                stored_encoding = encoding_data['encoding']
                match, similarity, distance = self.compare_faces(stored_encoding, unknown_encoding)
                
                # Consider match if:
                # 1. Distance is within tolerance AND
                # 2. Similarity is above minimum confidence
                if match and similarity >= min_confidence:
                    if similarity > best_similarity:
                        best_similarity = similarity
                        best_distance = distance
                        best_match = {
                            'user_id': encoding_data['user_id'],
                            'similarity': similarity,
                            'distance': distance,
                            'confidence': similarity  # Alias for clarity
                        }
            
            except Exception as e:
                logger.warning(f"Error comparing with user {encoding_data.get('user_id')}: {str(e)}")
                continue
        
        if best_match:
            logger.info(
                f"Found match: user_id={best_match['user_id']}, "
                f"similarity={best_match['similarity']:.4f}, "
                f"distance={best_match['distance']:.4f}"
            )
        else:
            logger.warning(f"No match found. Best similarity: {best_similarity:.4f} (required: {min_confidence:.4f})")
        
        return best_match
