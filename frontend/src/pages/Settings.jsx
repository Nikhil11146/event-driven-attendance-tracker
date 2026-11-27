import { useSettings } from "../context/SettingsContext.jsx";

export default function Settings() {
    const { theme, handleThemeToggle, targetPercentage, setTargetPercentage } = useSettings();

    return (
        <div className="settings-page">
            <h1 className="heading">Settings</h1>
            <div className="settings-list">
                <div className="settings-card">
                    <div>
                        <h3>Theme</h3>
                        <p className="settings-desc">Switch between light and dark mode</p>
                    </div>

                    <button
                        className={`theme-toggle-btn ${theme}`}
                        onClick={handleThemeToggle}
                        aria-label="Toggle theme"
                    />
                </div>

                <div className="settings-card">
                    <div>
                        <h3>Target Attendance (%)</h3>
                        <p className="settings-desc">
                            Used to calculate safe skips and recovery classes across your subjects
                        </p>
                    </div>

                    <div className="target-input-group">
                        <input
                            type="number"
                            min="1"
                            max="100"
                            className="target-perc-input"
                            value={targetPercentage}
                            onChange={(e) => setTargetPercentage(e.target.value)}
                        />
                        <span className="target-perc-unit">%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
