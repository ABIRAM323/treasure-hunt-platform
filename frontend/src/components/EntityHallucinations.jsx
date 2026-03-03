import { useState, useEffect } from 'react';

const entities = [
    { id: 'demogorgon', src: '/hallucinations/demogorgon.png', style: { bottom: '0', right: '0', width: '35vw', maxWidth: '500px' } },
    { id: 'vecna', src: '/hallucinations/vecna.png', style: { top: '10%', right: '0', width: '30vw', maxWidth: '400px' } },
];

export default function EntityHallucinations() {
    const [activeEntity, setActiveEntity] = useState(null);

    useEffect(() => {
        const triggerHallucination = () => {
            // Pick a random entity
            const randomEntity = entities[Math.floor(Math.random() * entities.length)];
            setActiveEntity(randomEntity.id);

            // Hide it after 5-8 seconds
            setTimeout(() => {
                setActiveEntity(null);
            }, 6000 + Math.random() * 2000);

            // Schedule the next one (every 15 to 45 seconds)
            setTimeout(triggerHallucination, 15000 + Math.random() * 30000);
        };

        // Initial delay
        const initialTimer = setTimeout(triggerHallucination, 5000);
        return () => clearTimeout(initialTimer);
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1000, overflow: 'hidden' }}>
            {entities.map(entity => (
                <img
                    key={entity.id}
                    src={entity.src}
                    alt=""
                    className={`phantom-entity ${activeEntity === entity.id ? 'phantom-visible' : ''}`}
                    style={{
                        ...entity.style,
                        position: 'absolute'
                    }}
                />
            ))}
        </div>
    );
}
