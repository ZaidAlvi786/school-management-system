"""
Face recognition service using face_recognition library
"""

import face_recognition
import numpy as np
from PIL import Image
import io
import base64
import logging
from typing import Optional, Tuple, List

logger = logging.getLogger(__name__)


class FaceRecognitionService:
    """Service for face recognition operations"""
    
    def __init__(self, tolerance: float = 0.6):
        """
        Initialize face recognition service
        
        Args:
            tolerance: Face matching tolerance (lower = more strict)
        """
        self.tolerance = tolerance
    
    def decode_base64_image(self, base64_string: str) -> Image.Image:
        """
        Decode base64 image string to PIL Image
        
        Args:
            base64_string: Base64 encoded image (with or without data URL prefix)
            
        Returns:
            PIL Image object
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
            
            return image
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise ValueError(f"Invalid image format: {str(e)}")
    
    def detect_face(self, image: Image.Image) -> Optional[np.ndarray]:
        """
        Detect and encode face from image
        
        Args:
            image: PIL Image object
            
        Returns:
            Face encoding (128-dimensional vector) or None if no face detected
        """
        try:
            # Convert PIL Image to numpy array
            image_array = np.array(image)
            
            # Detect face locations
            face_locations = face_recognition.face_locations(image_array)
            
            if len(face_locations) == 0:
                logger.warning("No face detected in image")
                return None
            
            if len(face_locations) > 1:
                logger.warning(f"Multiple faces detected ({len(face_locations)}). Only one face allowed.")
                return None
            
            # Get face encoding
            face_encodings = face_recognition.face_encodings(image_array, face_locations)
            
            if len(face_encodings) == 0:
                logger.warning("Could not generate face encoding")
                return None
            
            return face_encodings[0]
        
        except Exception as e:
            logger.error(f"Error detecting face: {str(e)}")
            raise ValueError(f"Face detection failed: {str(e)}")
    
    def generate_encoding(self, base64_image: str) -> List[float]:
        """
        Generate face encoding from base64 image
        
        Args:
            base64_image: Base64 encoded image string
            
        Returns:
            Face encoding as list of floats (128 dimensions)
        """
        image = self.decode_base64_image(base64_image)
        encoding = self.detect_face(image)
        
        if encoding is None:
            raise ValueError("No face detected in image. Please ensure exactly one face is visible.")
        
        return encoding.tolist()
    
    def compare_faces(
        self, 
        known_encoding: List[float], 
        unknown_encoding: List[float]
    ) -> Tuple[bool, float]:
        """
        Compare two face encodings
        
        Args:
            known_encoding: Known face encoding (list of floats)
            unknown_encoding: Unknown face encoding (list of floats)
            
        Returns:
            Tuple of (match: bool, distance: float)
        """
        try:
            known_array = np.array(known_encoding)
            unknown_array = np.array(unknown_encoding)
            
            # Calculate face distance
            distance = face_recognition.face_distance([known_array], unknown_array)[0]
            
            # Check if match (distance <= tolerance)
            match = distance <= self.tolerance
            
            # Convert distance to similarity score (0-1, higher = more similar)
            similarity = 1 - distance
            
            logger.info(f"Face comparison: match={match}, distance={distance:.4f}, similarity={similarity:.4f}")
            
            return match, float(similarity)
        
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            raise ValueError(f"Face comparison failed: {str(e)}")
    
    def find_matching_user(
        self, 
        unknown_encoding: List[float], 
        all_encodings: List[dict]
    ) -> Optional[dict]:
        """
        Find matching user from list of encodings
        
        Args:
            unknown_encoding: Face encoding to match
            all_encodings: List of dicts with 'user_id' and 'encoding' keys
            
        Returns:
            Matching user dict or None
        """
        best_match = None
        best_similarity = 0.0
        
        for encoding_data in all_encodings:
            try:
                stored_encoding = encoding_data['encoding']
                match, similarity = self.compare_faces(stored_encoding, unknown_encoding)
                
                if match and similarity > best_similarity:
                    best_similarity = similarity
                    best_match = {
                        'user_id': encoding_data['user_id'],
                        'similarity': similarity
                    }
            
            except Exception as e:
                logger.warning(f"Error comparing with user {encoding_data.get('user_id')}: {str(e)}")
                continue
        
        if best_match:
            logger.info(f"Found match: user_id={best_match['user_id']}, similarity={best_match['similarity']:.4f}")
        
        return best_match

