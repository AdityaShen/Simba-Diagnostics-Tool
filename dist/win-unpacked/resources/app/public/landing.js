/**
 * Simba Device Landing Page Script - landing.js
 * --------------------------------------------
 * Handles theme toggling and dynamic device grid population for the Simba landing page.
 *
 * Features:
 * - Theme toggle (dark/light) with localStorage persistence
 * - Fetches connected device info from backend and renders device cards
 * - Navigates to main app for selected device
 *
 * Author: Aditya Shenoy
 * License: MIT
 */

/**
 * Initializes the theme toggle button and applies the saved or default theme.
 */
function initThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    if (!toggle) return;

    const applyTheme = (theme) => {
        document.body.classList.toggle("dark", theme === "dark");
        document.body.setAttribute("data-theme", theme);
        toggle.setAttribute("aria-checked", theme === "dark");
    };

    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);

    toggle.addEventListener("click", () => {
        const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
        localStorage.setItem("theme", newTheme);
        applyTheme(newTheme);
    });
}

/**
 * Fetches the list of connected devices from the backend and populates the device grid.
 * Displays device info and provides a button to open the main app for each device.
 */
async function loadDevices() {
    const grid = document.getElementById("deviceGrid");
    try {
        const res = await fetch("/list-devices");
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const devices = data.devices;
        grid.innerHTML = "";

        // Render a card for each connected device
        devices.forEach((device) => {
            const card = document.createElement("div");
            card.className = "device-card";
            card.innerHTML = `
        <h3>${device.name || "Unknown Device"}</h3>
        <p><strong>Model:</strong> ${device.model}</p>
        <p><strong>Brand:</strong> ${device.brand}</p>
        <p><strong>Android:</strong> ${device.androidVersion}</p>
        <p><strong>Resolution:</strong> ${device.resolution}</p>
        <p><strong>Battery:</strong> ${device.battery || "Unknown"}</p>
        <p><strong>Wi-Fi:</strong> ${device.wifi}</p>
        <div class="buttons" style="margin-top: 0.5rem;">
          <button class="neon-button" style="color: white;" onclick="location.href='index.html?deviceId=${device.id}'">Open</button>
        </div>
      `;
            grid.appendChild(card);
        });
    } catch (err) {
        grid.innerHTML = `<p style="color:red;">Failed to load devices: ${err.message}</p>`;
    }
}

// Initialize theme and device grid on page load

document.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    loadDevices();
});
