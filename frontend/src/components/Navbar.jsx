import { useState } from "react";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
    const { isAuthenticated, signOut, setIsSignUp, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [openPath, setOpenPath] = useState(null);
    const menuOpen = openPath === location.pathname;

    function closeMenu() {
        setOpenPath(null);
    }

    function toggleMenu() {
        setOpenPath((prev) => (prev === location.pathname ? null : location.pathname));
    }

    function handleNavigate(path) {
        closeMenu();
        navigate(path);
    }

    function handleSignOut() {
        closeMenu();
        signOut();
    }

    return (
        <div className="navbar">
            <nav>
                <div className="navbar-top-row">
                    <div className="main-logo">
                        <Link to="/" onClick={closeMenu}>
                            Attendance Tracker
                        </Link>
                    </div>

                    <button
                        type="button"
                        className={`navbar-menu-toggle ${menuOpen ? 'is-open' : ''}`}
                        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                        aria-expanded={menuOpen}
                        onClick={toggleMenu}
                    >
                        <span className="menu-bar" />
                        <span className="menu-bar" />
                        <span className="menu-bar" />
                    </button>
                </div>

                <div className={`navbar-links ${menuOpen ? 'is-open' : ''}`}>
                    <div className="navbar-app-links navbar-links-section">
                        <ul>
                            <li>
                                <Link
                                    to="/"
                                    className={location.pathname === '/' || location.pathname === '/home' ? 'nav-link-active' : ''}
                                    onClick={closeMenu}
                                >
                                    Home
                                </Link>
                            </li>
                            {isAuthenticated && (
                                <li>
                                    <Link
                                        to="/logs"
                                        className={location.pathname === '/logs' ? 'nav-link-active' : ''}
                                        onClick={closeMenu}
                                    >
                                        Activity Logs
                                    </Link>
                                </li>
                            )}
                            <li>
                                <Link
                                    to="/about"
                                    className={location.pathname === '/about' ? 'nav-link-active' : ''}
                                    onClick={closeMenu}
                                >
                                    About
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="navbar-auth-links navbar-links-section">
                        {isAuthenticated ? (
                            <div className="user-profile-container">
                                <p className="user-profile-navbar-heading">Hello, {user?.name}</p>
                                <div className="navbar-profile-actions">
                                    <button className="profile-btn" onClick={() => handleNavigate('/profile')}>Profile</button>
                                    <button className="profile-btn" onClick={() => handleNavigate('/settings')}>Settings</button>
                                    <button className="profile-btn logout-btn" onClick={handleSignOut}>log out</button>
                                </div>
                            </div>
                        ) : (
                            <ul className="navbar-guest-actions">
                                <li className="link-signup">
                                    <Link
                                        to="/auth"
                                        onClick={() => {
                                            setIsSignUp(false);
                                            closeMenu();
                                        }}
                                    >
                                        Sign In
                                    </Link>
                                </li>
                                <li className="link-signin">
                                    <Link
                                        to="/auth"
                                        onClick={() => {
                                            setIsSignUp(true);
                                            closeMenu();
                                        }}
                                    >
                                        Sign Up
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
            </nav>
        </div>
    );
}
