import React, { useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import animationData from '@/lotties/stage-loader.json';

export default function Loader() {
    const lottieRef = useRef<LottieRefCurrentProps>(null);

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#fafafa'
            }}
        >
            <Lottie
                animationData={animationData}
                autoplay
                loop
                lottieRef={lottieRef}
                style={{ width: 80, height: 80 }}
            />
        </div>
    );
}
