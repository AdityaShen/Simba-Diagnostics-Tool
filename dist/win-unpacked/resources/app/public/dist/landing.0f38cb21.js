function initThemeToggle() {
    let e = document.getElementById("themeToggle");
    if (!e) return;
    let t = (t) => {
        (document.body.classList.toggle("dark", "dark" === t),
            document.body.setAttribute("data-theme", t),
            e.setAttribute("aria-checked", "dark" === t));
    };
    (t(localStorage.getItem("theme") || "dark"),
        e.addEventListener("click", () => {
            let e = document.body.classList.contains("dark") ? "light" : "dark";
            (localStorage.setItem("theme", e), t(e));
        }));
}
async function loadDevices() {
    let e = document.getElementById("deviceGrid");
    try {
        let t = await fetch("/list-devices"),
            n = await t.json();
        if (!n.success) throw Error(n.message);
        let o = n.devices;
        ((e.innerHTML = ""),
            o.forEach((t) => {
                let n = document.createElement("div");
                ((n.className = "device-card"),
                    (n.innerHTML = `
        <h3>${t.name || "Unknown Device"}</h3>
        <p><strong>Model:</strong> ${t.model}</p>
        <p><strong>Brand:</strong> ${t.brand}</p>
        <p><strong>Android:</strong> ${t.androidVersion}</p>
        <p><strong>Resolution:</strong> ${t.resolution}</p>
        <p><strong>Battery:</strong> ${t.battery || "Unknown"}</p>
        <p><strong>Wi-Fi:</strong> ${t.wifi}</p>
        <div class="buttons" style="margin-top: 0.5rem;">
          <button class="neon-button" style="color: white;" onclick="location.href='index.html?deviceId=${t.id}'">Open</button>
        </div>
      `),
                    e.appendChild(n));
            }));
    } catch (t) {
        e.innerHTML = `<p style="color:red;">Failed to load devices: ${t.message}</p>`;
    }
}
document.addEventListener("DOMContentLoaded", () => {
    (initThemeToggle(), loadDevices());
});
//# sourceMappingURL=landing.0f38cb21.js.map
