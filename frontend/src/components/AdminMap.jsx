export default function AdminMap({ teams, clues }) {
    // 100x100 coordinate canvas mapped to SVG 600x600
    const scale = 5.5;
    const physicalClues = clues.filter((c) => c.type === 'physical' && c.locationCoords);

    const locationColors = {};
    teams.forEach((team, idx) => {
        if (team.lastLocation) locationColors[team.lastLocation] = idx;
    });

    const teamColors = [
        '#00ff88', '#00e5ff', '#b84dff', '#ff2d7e', '#ffe000',
        '#ff7a00', '#44ff00', '#ff44aa', '#00aaff', '#aa44ff',
    ];

    return (
        <div className="card">
            <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h3>Campus Locations</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {teams.filter((t) => t.lastLocation).map((t, idx) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: teamColors[idx % teamColors.length] }} />
                            {t.name}
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <svg viewBox="0 0 600 600" style={{ width: '100%', maxHeight: '500px', display: 'block' }}>
                    {/* Grid */}
                    {Array.from({ length: 11 }, (_, i) => (
                        <g key={i}>
                            <line x1={i * 60} y1={0} x2={i * 60} y2={600} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                            <line x1={0} y1={i * 60} x2={600} y2={i * 60} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
                        </g>
                    ))}

                    {/* Physical clue location nodes */}
                    {physicalClues.map((clue) => {
                        const x = (clue.locationCoords?.x || 0) * scale;
                        const y = (clue.locationCoords?.y || 0) * scale;
                        const teamHere = teams.find((t) => t.lastLocation === clue.locationName);
                        const teamIdx = teams.indexOf(teamHere);
                        const color = teamHere ? teamColors[teamIdx % teamColors.length] : 'rgba(0,229,255,0.5)';

                        return (
                            <g key={clue._id}>
                                <circle cx={x} cy={y} r={teamHere ? 14 : 10} fill={color} opacity={0.3} />
                                <circle cx={x} cy={y} r={teamHere ? 7 : 5} fill={color} />
                                <text x={x} y={y - 15} textAnchor="middle" fill="#8899bb" fontSize={10} fontFamily="monospace">
                                    {clue.locationName ? clue.locationName.split(' ')[0] : `C${clue.clueNumber}`}
                                </text>
                                {teamHere && (
                                    <text x={x} y={y + 24} textAnchor="middle" fill={color} fontSize={9} fontFamily="monospace">
                                        {teamHere.name}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Legend */}
                    <text x={10} y={590} fill="rgba(255,255,255,0.2)" fontSize={10} fontFamily="monospace">
                        Campus Map — Live Team Positions
                    </text>
                </svg>
            </div>

            {teams.filter((t) => t.lastLocation).length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    No team has scanned a physical location QR yet.
                </p>
            )}
        </div>
    );
}
