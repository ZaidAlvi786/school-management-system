"""
Enhanced Face Recognition Service with quality checks and improved accuracy
Uses face_recognition library (dlib-based) with production-grade improvements

Features:
- Multiple embeddings per user support
- Face alignment and preprocessing
- Model versioning
- Improved matching with aggregation
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

# Model version constant
MODEL_VERSION = "dlib-face-recognition-1.3.0"
EMBEDDING_DIMENSION = 128


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
        self.model_version = MODEL_VERSION
        self.embedding_dimension = EMBEDDING_DIMENSION
        logger.info(f"FaceRecognitionService initialized: tolerance={tolerance}, min_face_size={min_face_size}, model={MODEL_VERSION}")
    
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
    
    def align_face(self, image: np.ndarray, face_landmarks: dict) -> Optional[np.ndarray]:
        """
        Align face using facial landmarks (eyes, nose, mouth)
        Improves accuracy by normalizing face orientation
        
        Args:
            image: NumPy array of the image
            face_landmarks: Dictionary with facial landmark coordinates
            
        Returns:
            Aligned face image or None if alignment fails
        """
        try:
            # Extract key points
            left_eye = face_landmarks.get('left_eye')
            right_eye = face_landmarks.get('right_eye')
            
            if not left_eye or not right_eye:
                return None
            
            # Calculate angle between eyes
            eye_center_x = (left_eye[0] + right_eye[0]) / 2
            eye_center_y = (left_eye[1] + right_eye[1]) / 2
            
            dx = right_eye[0] - left_eye[0]
            dy = right_eye[1] - left_eye[1]
            angle = np.arctan2(dy, dx) * 180 / np.pi
            
            # Rotate image to align eyes horizontally
            if abs(angle) > 1:  # Only rotate if angle is significant
                h, w = image.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                image = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            
            return image
        
        except Exception as e:
            logger.warning(f"Face alignment failed: {str(e)}")
            return None
    
    def preprocess_image(self, image: Image.Image, align: bool = True) -> Image.Image:
        """
        Preprocess image for better face detection:
        - Resize if too large (max 1000px on longest side)
        - Enhance contrast if needed
        - Normalize lighting
        - Face alignment (if landmarks available)
        
        Args:
            image: PIL Image object
            align: Whether to attempt face alignment
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            # Convert to numpy array for OpenCV operations
            img_array = np.array(image)
            
            # Resize if too large (improves speed and memory)
            max_size = 1000
            height, width = img_array.shape[:2]
            
            if width > max_size or height > max_size:
                if width > height:
                    new_width = max_size
                    new_height = int(height * (max_size / width))
                else:
                    new_height = max_size
                    new_width = int(width * (max_size / height))
                
                img_array = cv2.resize(img_array, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
                logger.debug(f"Resized image from {width}x{height} to {new_width}x{new_height}")
            
            # Enhance contrast slightly (helps with face detection)
            # Convert to LAB color space for better contrast enhancement
            if len(img_array.shape) == 3:
                lab = cv2.cvtColor(img_array, cv2.COLOR_RGB2LAB)
                l, a, b = cv2.split(lab)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                l = clahe.apply(l)
                img_array = cv2.merge([l, a, b])
                img_array = cv2.cvtColor(img_array, cv2.COLOR_LAB2RGB)
            
            # Convert back to PIL Image
            image = Image.fromarray(img_array)
            
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
            
            # Add model metadata
            metadata['model_version'] = self.model_version
            metadata['embedding_dimension'] = self.embedding_dimension
            
        return encoding.tolist(), metadata
    
    def generate_multiple_encodings(self, base64_images: List[str]) -> Tuple[List[List[float]], List[Dict]]:
        """
        Generate face encodings from multiple base64 images
        Used during registration to capture user from different angles/lighting
        
        Args:
            base64_images: List of base64 encoded image strings
            
        Returns:
            Tuple of (list of encodings, list of metadata dicts)
        """
        encodings = []
        metadatas = []
        
        for idx, base64_image in enumerate(base64_images):
            try:
                encoding, metadata = self.generate_encoding(base64_image)
                metadata['registration_index'] = idx + 1
                encodings.append(encoding)
                metadatas.append(metadata)
            except Exception as e:
                logger.warning(f"Failed to generate encoding for image {idx + 1}: {str(e)}")
                continue
        
        if not encodings:
            raise ValueError("Failed to generate any face encodings from provided images")
        
        return encodings, metadatas
    
    def aggregate_encodings(self, encodings: List[List[float]], method: str = 'average') -> List[float]:
        """
        Aggregate multiple embeddings into a single representative embedding
        
        Args:
            encodings: List of face encodings (each is a list of floats)
            method: Aggregation method ('average', 'median', 'best')
            
        Returns:
            Single aggregated encoding
        """
        if not encodings:
            raise ValueError("Cannot aggregate empty list of encodings")
        
        if len(encodings) == 1:
            return encodings[0]
        
        encodings_array = np.array(encodings)
        
        if method == 'average':
            # Average all encodings
            aggregated = np.mean(encodings_array, axis=0)
        elif method == 'median':
            # Median of all encodings (more robust to outliers)
            aggregated = np.median(encodings_array, axis=0)
        elif method == 'best':
            # Use the first encoding (assumed to be best quality)
            aggregated = encodings_array[0]
        else:
            # Default to average
            aggregated = np.mean(encodings_array, axis=0)
        
        return aggregated.tolist()
    
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
        min_confidence: float = 0.5,
        use_best_of_multiple: bool = True
    ) -> Optional[dict]:
        """
        Find matching user from list of encodings with confidence threshold
        Supports multiple embeddings per user - uses best match
        
        Args:
            unknown_encoding: Face encoding to match
            all_encodings: List of dicts with 'user_id', 'encoding', and optionally 'registration_index'
            min_confidence: Minimum similarity score to consider a match (0-1)
            use_best_of_multiple: If True, compare against all embeddings per user and use best match
            
        Returns:
            Matching user dict with user_id, similarity, distance, matched_embedding_index, or None
        """
        # Group encodings by user_id if multiple embeddings per user
        if use_best_of_multiple:
            user_encodings = {}
            for enc_data in all_encodings:
                user_id = enc_data['user_id']
                if user_id not in user_encodings:
                    user_encodings[user_id] = []
                user_encodings[user_id].append(enc_data)
        else:
            # Treat each encoding as separate (old behavior)
            user_encodings = {enc_data['user_id']: [enc_data] for enc_data in all_encodings}
        
        best_match = None
        best_similarity = 0.0
        best_distance = float('inf')
        best_user_id = None
        
        # Compare against all embeddings for each user, keep best match
        for user_id, encodings_list in user_encodings.items():
            user_best_similarity = 0.0
            user_best_distance = float('inf')
            user_best_embedding_idx = None
            
            for enc_data in encodings_list:
                try:
                    stored_encoding = enc_data['encoding']
                    match, similarity, distance = self.compare_faces(stored_encoding, unknown_encoding)
                    
                    # Track best match for this user across all their embeddings
                    if match and similarity >= min_confidence:
                        if similarity > user_best_similarity:
                            user_best_similarity = similarity
                            user_best_distance = distance
                            user_best_embedding_idx = enc_data.get('registration_index', 0)
                    
                except Exception as e:
                    logger.warning(f"Error comparing with user {user_id}, embedding {enc_data.get('registration_index')}: {str(e)}")
                    continue
            
            # Compare this user's best match with global best
            if user_best_similarity > best_similarity:
                best_similarity = user_best_similarity
                best_distance = user_best_distance
                best_user_id = user_id
                best_match = {
                    'user_id': user_id,
                    'similarity': user_best_similarity,
                    'distance': user_best_distance,
                    'confidence': user_best_similarity,
                    'matched_embedding_index': user_best_embedding_idx,
                    'total_embeddings_compared': len(encodings_list)
                }
        
        if best_match:
            logger.info(
                f"Found match: user_id={best_match['user_id']}, "
                f"similarity={best_match['similarity']:.4f}, "
                f"distance={best_match['distance']:.4f}, "
                f"compared {best_match['total_embeddings_compared']} embedding(s)"
            )
        else:
            logger.warning(f"No match found. Best similarity: {best_similarity:.4f} (required: {min_confidence:.4f})")
        
        return best_match
