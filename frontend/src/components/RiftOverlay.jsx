import { useEffect, useState } from 'react';

export default function RiftOverlay() {
    const [spores, setSpores] = useState([]);

    useEffect(() => {
        // Create 30 spores with random positions and delays
        const newSpores = Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 45}%`, // Mostly on the left side
            delay: `${Math.random() * 20}s`,
            duration: `${15 + Math.random() * 15}s`,
            size: `${2 + Math.random() * 4}px`
        }));
        setSpores(newSpores);
    }, []);

    return (
        <>
            <div className="rift-container">
                <div className="rift-line"></div>
            </div>
            <div className="spore-overlay">
                {spores.map(spore => (
                    <div
                        key={spore.id}
                        className="spore"
                        style={{
                            left: spore.left,
                            animationDelay: spore.delay,
                            animationDuration: spore.duration,
                            width: spore.size,
                            height: spore.size
                        }}
                    />
                ))}
            </div>
        </>
    );
}
