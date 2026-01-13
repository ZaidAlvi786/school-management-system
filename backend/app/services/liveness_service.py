"""
Liveness Detection Service
Prevents spoofing attacks using photos, videos, or phone screens

Techniques:
- Eye blink detection
- Head movement tracking
- Basic texture analysis (future)
"""

import logging
import cv2
import numpy as np
from typing import Dict, Optional, List, Tuple
from PIL import Image
import io
import base64

logger = logging.getLogger(__name__)


class LivenessService:
    """
    Service for detecting if a face in an image/video is live (real person)
    or a spoof (photo, video, screen)
    """
    
    def __init__(self):
        """Initialize liveness detection service"""
        self.min_blink_count = 1  # Minimum blinks required
        self.min_head_angle = 15  # Minimum head rotation angle in degrees
        logger.info("LivenessService initialized")
    
    def decode_base64_image(self, base64_string: str) -> np.ndarray:
        """Decode base64 image to numpy array"""
        try:
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]
            
            image_data = base64.b64decode(base64_string)
            pil_image = Image.open(io.BytesIO(image_data))
            
            if pil_image.mode != "RGB":
                pil_image = pil_image.convert("RGB")
            
            return np.array(pil_image)
        except Exception as e:
            logger.error(f"Error decoding base64 image: {str(e)}")
            raise ValueError(f"Invalid image format: {str(e)}")
    
    def detect_blinks(self, face_images: List[np.ndarray]) -> Dict:
        """
        Detect eye blinks across a sequence of images
        
        Args:
            face_images: List of face images (frames from video)
            
        Returns:
            Dict with blink_count, is_live, confidence
        """
        if len(face_images) < 3:
            return {
                'blink_count': 0,
                'is_live': False,
                'confidence': 0.0,
                'message': 'Insufficient frames for blink detection'
            }
        
        try:
            # Use simple eye aspect ratio (EAR) method
            # For production, use MediaPipe Face Mesh or dlib facial landmarks
            
            blink_count = 0
            eye_states = []  # Track if eyes are open/closed
            
            for frame in face_images:
                # Convert to grayscale
                gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY) if len(frame.shape) == 3 else frame
                
                # Use Haar Cascade for eye detection (basic method)
                # In production, use more accurate methods like MediaPipe
                eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
                eyes = eye_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
                
                # If eyes detected, consider them open
                eye_open = len(eyes) >= 2  # Both eyes should be detected
                eye_states.append(eye_open)
            
            # Count blinks (transitions from open to closed to open)
            for i in range(1, len(eye_states) - 1):
                if eye_states[i-1] and not eye_states[i] and eye_states[i+1]:
                    blink_count += 1
            
            is_live = blink_count >= self.min_blink_count
            confidence = min(1.0, blink_count / max(1, self.min_blink_count))
            
            return {
                'blink_count': blink_count,
                'is_live': is_live,
                'confidence': confidence,
                'message': f'Detected {blink_count} blink(s)' if is_live else 'No blinks detected'
            }
        
        except Exception as e:
            logger.error(f"Blink detection error: {str(e)}")
            return {
                'blink_count': 0,
                'is_live': False,
                'confidence': 0.0,
                'message': f'Blink detection failed: {str(e)}'
            }
    
    def detect_head_movement(self, face_images: List[np.ndarray]) -> Dict:
        """
        Detect head movement (left/right rotation) across a sequence of images
        
        Args:
            face_images: List of face images
            
        Returns:
            Dict with head_angles, movement_detected, is_live, confidence
        """
        if len(face_images) < 3:
            return {
                'movement_detected': False,
                'is_live': False,
                'confidence': 0.0,
                'message': 'Insufficient frames for head movement detection'
            }
        
        try:
            # Use face detection to track face position/angle
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            face_positions = []
            
            for frame in face_images:
                gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY) if len(frame.shape) == 3 else frame
                faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)
                
                if len(faces) > 0:
                    # Get largest face
                    largest_face = max(faces, key=lambda f: f[2] * f[3])
                    x, y, w, h = largest_face
                    center_x = x + w / 2
                    center_y = y + h / 2
                    face_positions.append({
                        'center_x': center_x,
                        'center_y': center_y,
                        'width': w,
                        'height': h
                    })
            
            if len(face_positions) < 3:
                return {
                    'movement_detected': False,
                    'is_live': False,
                    'confidence': 0.0,
                    'message': 'Could not track face position consistently'
                }
            
            # Calculate movement
            center_positions = [pos['center_x'] for pos in face_positions]
            min_x = min(center_positions)
            max_x = max(center_positions)
            movement_range = max_x - min_x
            
            # Normalize by face width
            avg_face_width = np.mean([pos['width'] for pos in face_positions])
            normalized_movement = movement_range / max(1, avg_face_width) * 100  # Percentage
            
            # Consider movement detected if face moved significantly
            movement_detected = normalized_movement > 10  # 10% of face width
            is_live = movement_detected
            
            confidence = min(1.0, normalized_movement / 30.0)  # Full confidence at 30% movement
            
            return {
                'movement_detected': movement_detected,
                'normalized_movement': normalized_movement,
                'is_live': is_live,
                'confidence': confidence,
                'message': f'Head movement detected: {normalized_movement:.1f}%' if is_live else 'No significant head movement detected'
            }
        
        except Exception as e:
            logger.error(f"Head movement detection error: {str(e)}")
            return {
                'movement_detected': False,
                'is_live': False,
                'confidence': 0.0,
                'message': f'Head movement detection failed: {str(e)}'
            }
    
    def verify_liveness(
        self,
        challenge_type: str,
        face_images: List[np.ndarray],
        challenge_data: Optional[Dict] = None
    ) -> Dict:
        """
        Verify liveness based on challenge type
        
        Args:
            challenge_type: Type of challenge ('blink', 'head_left', 'head_right', 'combined')
            face_images: List of face images from the challenge
            challenge_data: Optional additional data (e.g., expected movement direction)
            
        Returns:
            Dict with is_live, confidence, challenge_passed, details
        """
        results = {
            'is_live': False,
            'confidence': 0.0,
            'challenge_passed': False,
            'challenge_type': challenge_type,
            'details': {}
        }
        
        try:
            if challenge_type == 'blink':
                blink_result = self.detect_blinks(face_images)
                results['is_live'] = blink_result['is_live']
                results['confidence'] = blink_result['confidence']
                results['challenge_passed'] = blink_result['is_live']
                results['details']['blink'] = blink_result
            
            elif challenge_type in ['head_left', 'head_right']:
                movement_result = self.detect_head_movement(face_images)
                results['is_live'] = movement_result['is_live']
                results['confidence'] = movement_result['confidence']
                results['challenge_passed'] = movement_result['is_live']
                results['details']['movement'] = movement_result
                
                # Check direction if specified
                if challenge_data and 'direction' in challenge_data:
                    # Additional direction check can be added here
                    pass
            
            elif challenge_type == 'combined':
                # Require both blink and head movement
                blink_result = self.detect_blinks(face_images)
                movement_result = self.detect_head_movement(face_images)
                
                combined_confidence = (blink_result['confidence'] + movement_result['confidence']) / 2
                combined_live = blink_result['is_live'] and movement_result['is_live']
                
                results['is_live'] = combined_live
                results['confidence'] = combined_confidence
                results['challenge_passed'] = combined_live
                results['details']['blink'] = blink_result
                results['details']['movement'] = movement_result
            
            else:
                results['details']['error'] = f'Unknown challenge type: {challenge_type}'
            
            return results
        
        except Exception as e:
            logger.error(f"Liveness verification error: {str(e)}")
            results['details']['error'] = str(e)
            return results
    
    def verify_liveness_from_base64(
        self,
        challenge_type: str,
        base64_images: List[str],
        challenge_data: Optional[Dict] = None
    ) -> Dict:
        """
        Verify liveness from base64 encoded images
        
        Args:
            challenge_type: Type of challenge
            base64_images: List of base64 encoded image strings
            challenge_data: Optional challenge data
            
        Returns:
            Liveness verification result
        """
        try:
            face_images = [self.decode_base64_image(img) for img in base64_images]
            return self.verify_liveness(challenge_type, face_images, challenge_data)
        except Exception as e:
            logger.error(f"Error verifying liveness from base64: {str(e)}")
            return {
                'is_live': False,
                'confidence': 0.0,
                'challenge_passed': False,
                'challenge_type': challenge_type,
                'details': {'error': str(e)}
            }
