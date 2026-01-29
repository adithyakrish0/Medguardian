import { useEffect, useRef, useState } from "react";
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

export const useMediaPipe = () => {
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initMediaPipe = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1,
                    minHandDetectionConfidence: 0.25,
                    minHandPresenceConfidence: 0.25,
                    minTrackingConfidence: 0.25
                });
                setHandLandmarker(landmarker);
                setIsLoading(false);
            } catch (error) {
                console.error("MediaPipe initialization failed:", error);
                setIsLoading(false);
            }
        };

        initMediaPipe();

        return () => {
            if (handLandmarker) {
                handLandmarker.close();
            }
        };
    }, []);

    const detectHand = (video: HTMLVideoElement) => {
        if (!handLandmarker || video.readyState < 2 || video.videoWidth === 0) return null;

        const startTimeMs = performance.now();
        let results;
        try {
            results = handLandmarker.detectForVideo(video, startTimeMs);
        } catch (err) {
            console.error("MediaPipe detection error:", err);
            return null;
        }

        if (results.landmarks && results.landmarks.length > 0) {
            // Hand detected! Calculate bounding box
            const landmarks = results.landmarks[0];
            let minX = 1, minY = 1, maxX = 0, maxY = 0;

            landmarks.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });

            // Add some padding (20%)
            const width = maxX - minX;
            const height = maxY - minY;
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;
            const size = Math.max(width, height) * 1.5; // Bigger box to ensure bottle is included

            return {
                isPresent: true,
                bbox: {
                    x: Math.max(0, centerX - size / 2),
                    y: Math.max(0, centerY - size / 2),
                    width: Math.min(1, size),
                    height: Math.min(1, size)
                }
            };
        }

        return { isPresent: false };
    };

    return { detectHand, isLoading };
};
