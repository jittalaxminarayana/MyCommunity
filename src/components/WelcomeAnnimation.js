import React, { useEffect, useRef } from 'react';
import LottieView from 'lottie-react-native';

export default function WelcomeAnnimation() {
  const animationRef = useRef(null);

  useEffect(() => {
    if (animationRef.current) {
      // Automatically plays the animation
      animationRef.current.play();
      // Optionally play between specific frames
      animationRef.current.play(20, 100);
    }
  }, []);

  return (
    <LottieView
      ref={animationRef}
      source={require('../Annimations/welcomeToCommunity.json')}
      autoPlay={true}
      loop={true}
      style={{ width: "100%", height: "100%" }} // Optional styling
    />
  );
}
