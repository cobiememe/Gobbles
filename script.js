/* ---------- CONFIG ---------- */
const SUPABASE_URL  = "https://nigwdyolfgixcejslaue.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pZ3dkeW9sZmdpeGNlanNsYXVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwNTMzNzMsImV4cCI6MjA3NTYyOTM3M30.u3g0vzcuF6LstbnsrYyzl1TezJa-lKkd0xk55iddoyw";

const RECEIVER_WALLET = "Eamw917X8VNmH6xuD6mnR9Z5uyganASWRr4aNUU4tomt";
const RPC              = "https://mainnet.helius-rpc.com/?api-key=b5dce25c-09db-45bd-ba9b-d2e2f16fc841";
const HELIUS           = "4e2d8758-bf0e-473b-ae3c-c31bf809553c";

/* ---------- LIB INIT ---------- */
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ---------- UI refs ---------- */
const statusEl = document.getElementById("wallet-status");
const connectBtn = document.getElementById("connectBtn");
const postBtn = document.getElementById("postBtn");
const feed = document.getElementById("feed");
const postText = document.getElementById("postText");
const postSound = document.getElementById("postSound");
const boomSound = document.getElementById("boomSound");
const trendBox = document.getElementById("trendBox");
const filterBadge = document.getElementById("filterBadge");
const resetFeedBtn = document.getElementById("resetFeedBtn");
const searchPostsInput = document.getElementById("searchPostsInput");
const filterUserInput = document.getElementById("filterUserInput");

// Profil-Level Anzeige-Element
const profileLevelBadge = document.getElementById("profileLevelBadge");

// ---------- Level System ----------
const LEVELS = [
  { level: 1, name: "Greenhorn",     emoji: "🐣" },
  { level: 2, name: "Newcomer",      emoji: "🌱" },
  { level: 3, name: "Chatter",       emoji: "🐿️" },
  { level: 4, name: "Contributor",   emoji: "🔥" },
  { level: 5, name: "Trusted Voice", emoji: "🦉" },
  { level: 6, name: "Insider",       emoji: "💎" },
  { level: 7, name: "Trendsetter",   emoji: "⚡" },
  { level: 8, name: "Influencer",    emoji: "🐉" },
  { level: 9, name: "Icon",          emoji: "👑" },
  { level: 10, name: "Legend",       emoji: "🌌" }
];

function getLevelMeta(level) {
  const lvl = Number(level) || 1;
  return LEVELS.find(l => l.level === lvl) || LEVELS[0];
}

// Hilfsfunktion für Tier-Einteilung
function getLevelTier(level) {
  if (level >= 10) return "legend";
  if (level >= 7) return "elite";
  if (level >= 4) return "pro";
  return "novice";
}

function renderLevelBadge(level) {
  const meta = getLevelMeta(level);
  meta.levelTier = getLevelTier(level);
  return `
    <div class="level-badge level-${meta.level}">
      <span class="level-emoji">${meta.emoji}</span>
      <span class="level-name">${meta.name}</span>
      <span class="level-number">L${meta.level}</span>
    </div>
  `;
}

// aktuelles Level des eingeloggten Users (für Profil / Save)
let currentLevel = 1;

let wallet = null;
let currentFilter = null;
let uploadedAvatar = null;
let currentSearchTerm = "";
let currentUserFilter = "";

/* === Gobbles Portal Hover Sound === */
document.addEventListener("DOMContentLoaded", () => {
  const portalSound = document.getElementById("rickSound");
  if (!portalSound) return;

  document.querySelectorAll(".post").forEach(post => {
    post.addEventListener("mouseenter", () => {
      try {
        portalSound.currentTime = 0;
        portalSound.volume = 0.15;
        portalSound.play().catch(e => console.log("Portal sound play failed:", e));
      } catch (err) {
        console.log("⚠️ Portal-Sound konnte nicht abgespielt werden");
      }
    });
  });
});

/* === 🌀 Dynamic Logo Switcher === */
const logoImg = document.getElementById("logoImg");
const logoImages = [
  "/img/1Solana.png",
  "/img/1prison6.png",
  "/img/1boss.png",
  "/img/1bitcoin.png", 
  "/img/1prison3.jpg",
  "/img/1Solana.png",
  "/img/1prison6.png",
  "/img/1uuuuu.png",
  "/img/1Troll.png",
  "/img/1bitcoin.png",
  "/img/1prison2.png",
  "/img/1Solana.png",
  "/img/1prison4.png",
  "/img/1prison6.png",
  "/img/1bitcoin.png",
  "/img/1prison7.png",
  "/img/1prison8.png",
  "/img/1prison6.png"
];
let currentLogo = 0;

if (logoImg) {
  setInterval(() => {
    currentLogo = (currentLogo + 1) % logoImages.length;
    logoImg.style.opacity = "0";
    
    setTimeout(() => {
      logoImg.src = logoImages[currentLogo];
      logoImg.style.opacity = "1";
    }, 400);
  }, 9000);
}

/* === Fallback Avatar Generation === */
function generateFallbackAvatar(address) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 200;
  canvas.height = 200;

  const hue = address.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  
  const grad = ctx.createLinearGradient(0, 0, 200, 200);
  grad.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
  grad.addColorStop(1, `hsl(${(hue + 80) % 360}, 70%, 60%)`);
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 200, 200);

  ctx.fillStyle = `hsla(${(hue + 120) % 360}, 60%, 40%, 0.1)`;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 200;
    const y = Math.random() * 200;
    const size = Math.random() * 10 + 5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas.toDataURL("image/png");
}

/* === Portfolio Management === */
let portfolio = [];
const assetInput = document.getElementById("assetInput");
const percentInput = document.getElementById("percentInput");
const portfolioList = document.getElementById("portfolioList");
const avatarPreview = document.getElementById("avatarPreview");
const avatarUpload = document.getElementById("avatarUpload");

function addAssetToChart() {
  if (!assetInput || !percentInput) return;
  
  const name = assetInput.value.trim();
  const val = parseFloat(percentInput.value);
  
  if (!name || !val || val <= 0) return;
  
  const existingIndex = portfolio.findIndex(item => item.name.toLowerCase() === name.toLowerCase());
  if (existingIndex > -1) {
    portfolio[existingIndex].val = val;
  } else {
    portfolio.push({ name, val });
  }
  
  assetInput.value = "";
  percentInput.value = "";
  updatePortfolioList();
  updateChart();
}

function removeAsset(index) {
  portfolio.splice(index, 1);
  updatePortfolioList();
  updateChart();
}

function updatePortfolioList() {
  if (!portfolioList) return;
  portfolioList.innerHTML = portfolio.map((item, index) => `
    <div class="portfolio-item">
      <span>${item.name}</span>
      <span>${item.val}%</span>
      <span class="remove-asset" onclick="removeAsset(${index})">×</span>
    </div>
  `).join("");
}

// Smart input flow
if (assetInput) {
  assetInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && percentInput.value) {
      addAssetToChart();
    }
  });
}

if (percentInput) {
  percentInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && assetInput.value) {
      addAssetToChart();
    }
  });
}

// Avatar upload handler
if (avatarUpload) {
  avatarUpload.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        uploadedAvatar = event.target.result;
        if (avatarPreview) avatarPreview.src = uploadedAvatar;
      };
      reader.readAsDataURL(file);
    }
  });
}

/* === Portfolio Chart === */
let chartCtx = document.getElementById("portfolioChart")?.getContext("2d");
let portfolioChart;

function updateChart() {
  if (!chartCtx) return;
  
  const assets = portfolio.map(p => p.name);
  const values = portfolio.map(p => p.val);

  const total = values.reduce((a, b) => a + b, 0);
  if (total < 100 && total > 0) {
    assets.push("Other");
    values.push(100 - total);
  }

  if (portfolioChart) portfolioChart.destroy();

  portfolioChart = new Chart(chartCtx, {
    type: "doughnut",
    data: {
      labels: assets,
      datasets: [{
        data: values,
        backgroundColor: [
          "#00eaff",
          "#9945FF", 
          "#14F195",
          "#FF6B6B",
          "#FFD166",
          "#06D6A0"
        ],
        borderWidth: 2,
        borderColor: "#0b0f14"
      }]
    },
    options: {
      cutout: "65%",
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true
        },
        datalabels: {
          color: "#fff",
          font: { 
            weight: "bold",
            size: 11,
            family: "Barlow"
          },
          formatter: (value, ctx) => {
            return ctx.chart.data.labels[ctx.dataIndex];
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

/* ---------- Profile Management ---------- */
async function loadProfile(targetWallet, options = {}) {
  const { readOnly = false } = options;

  const effectiveWallet = targetWallet || wallet;
  if (!effectiveWallet) return;

  // Modal-Modus setzen (view/edit)
  const profileModal = document.getElementById("profileModal");
  if (profileModal) {
    profileModal.classList.toggle("view-mode", readOnly);
    profileModal.classList.toggle("edit-mode", !readOnly);
  }

  // Überschrift anpassen
  const heading = document.querySelector(".profile-left h2");
  if (heading) {
    heading.textContent = readOnly ? "User Profile" : "Your Profile";
  }

  // Buttons / Inputs für Read-Only umschalten
  const bioInput = document.getElementById("bioInput");
  const assetInput = document.getElementById("assetInput");
  const percentInput = document.getElementById("percentInput");
  const saveBtn = document.getElementById("saveProfileBtn");
  const avatarUpload = document.getElementById("avatarUpload");
  const profileImageButtons = document.querySelector(".profile-image-buttons");

  const isReadOnly = readOnly || (targetWallet && targetWallet !== wallet);

  if (bioInput) bioInput.disabled = isReadOnly;
  if (assetInput) assetInput.disabled = isReadOnly;
  if (percentInput) percentInput.disabled = isReadOnly;
  if (avatarUpload) avatarUpload.disabled = isReadOnly;
  if (profileImageButtons) profileImageButtons.style.display = isReadOnly ? "none" : "flex";
  if (saveBtn) {
    saveBtn.style.display = isReadOnly ? "none" : "inline-block";
    saveBtn.disabled = isReadOnly;
  }

  try {
    const { data, error } = await db
      .from("profiles")
      .select("bio, portfolio, avatar, level")
      .eq("wallet", effectiveWallet)
      .maybeSingle();

    if (error) {
      console.error("❌ Error loading profile:", error);
      return;
    }

    const bioDisplay = document.getElementById("bioDisplay");

    if (data) {
      currentLevel = data.level || 1;
      if (profileLevelBadge) {
        profileLevelBadge.innerHTML = renderLevelBadge(currentLevel);
      }

      portfolio = Array.isArray(data.portfolio) ? data.portfolio : [];
      updatePortfolioList();
      updateChart();

      if (bioInput) bioInput.value = data.bio || "";
      if (bioDisplay) bioDisplay.textContent = data.bio || "";

      if (data.avatar && avatarPreview) {
        uploadedAvatar = data.avatar;
        avatarPreview.src = data.avatar;
      } else if (avatarPreview) {
        avatarPreview.src = generateFallbackAvatar(effectiveWallet);
      }
    } else {
      // Kein Profil vorhanden -> Defaults
      currentLevel = 1;
      if (profileLevelBadge) {
        profileLevelBadge.innerHTML = renderLevelBadge(currentLevel);
      }
      portfolio = [];
      updatePortfolioList();
      updateChart();

      if (bioInput) bioInput.value = "";
      if (bioDisplay) bioDisplay.textContent = "";

      if (avatarPreview) {
        avatarPreview.src = generateFallbackAvatar(effectiveWallet);
      }
    }
  } catch (err) {
    console.error("❌ JS error while loading profile:", err);
  }
}

async function saveProfile() {
  if (!wallet) {
    alert("Please connect your wallet first!");
    return;
  }

  try {
    const bioInput = document.getElementById("bioInput");
    const bio = bioInput ? bioInput.value.trim().slice(0, 140) : "";
    const safePortfolio = Array.isArray(portfolio)
      ? portfolio.map(p => ({
          name: String(p.name || "").slice(0, 32),
          val: Number(p.val) || 0
        }))
      : [];

    const { data, error } = await db
      .from("profiles")
      .upsert(
        {
          wallet,
          bio,
          portfolio: safePortfolio,
          avatar: uploadedAvatar,
          level: currentLevel || 1,
          updated_at: new Date().toISOString()
        },
        { onConflict: "wallet" }
      )
      .select()
      .single();

    if (error) {
      console.error("❌ Supabase save error:", error);
      alert("Error saving profile: " + error.message);
      return;
    }

    console.log("✅ Profile saved:", data);
    alert("✅ Profile saved successfully!");
    updateChart();
    
    const bioDisplay = document.getElementById("bioDisplay");
    if (bioDisplay) bioDisplay.textContent = bio;
    
    closeProfile();
  } catch (err) {
    console.error("❌ JS error:", err);
    alert("Error saving profile: " + err.message);
  }
}

async function openUserProfile(targetWallet) {
  if (!targetWallet) return;

  await loadProfile(targetWallet, { readOnly: true });

  const profileModal = document.getElementById("profileModal");
  if (profileModal) profileModal.style.display = "block";
}

/* === Reset Avatar Function === */
async function resetAvatar() {
  if (!wallet) {
    alert("Please connect your wallet first!");
    return;
  }

  if (!confirm("Are you sure you want to reset your avatar? This will remove your uploaded image and use your NFT or fallback avatar instead.")) {
    return;
  }

  try {
    uploadedAvatar = null;
    
    const nftAvatar = await avatar(wallet);
    
    if (avatarPreview) {
      if (nftAvatar) {
        avatarPreview.src = nftAvatar;
      } else {
        avatarPreview.src = generateFallbackAvatar(wallet);
      }
    }

    const { error } = await db
      .from("profiles")
      .upsert(
        {
          wallet,
          avatar: null,
          updated_at: new Date().toISOString()
        },
        { onConflict: "wallet" }
      );

    if (error) {
      console.error("❌ Error resetting avatar:", error);
      alert("Error resetting avatar: " + error.message);
      return;
    }

    console.log("✅ Avatar reset successfully!");
    alert("✅ Avatar reset! Using your NFT or fallback image.");
    
  } catch (err) {
    console.error("❌ JS error while resetting avatar:", err);
    alert("Error resetting avatar: " + err.message);
  }
}

/* ---------- Hashtag Functions ---------- */
function extractHashtags(text) {
  return (text.match(/#\w+/g) || []).map(t => t.toLowerCase().replace('#', ''));
}

function renderTextWithTags(text){
  const withTags = text.replace(/#(\w+)/g, `<span class="hashtag" data-tag="$1">#$1</span>`);
  return withTags.replace(/\n/g, "<br>");
}

/* ---------- Partikel/Sterne Animation ---------- */
const canvas = document.getElementById("particles");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Erstelle Partikel/Sterne
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.6 + 0.2
    });
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.speedX; 
      p.y += p.speedY;
      
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      ctx.fillStyle = `rgba(0,234,255,${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(animateParticles);
  }
  animateParticles();
}

/* ---------- Wallet helpers ---------- */
function getWallet(){ return window.phantom?.solana || window.solana; }

function uiConnected(pk){ 
  if (!statusEl || !connectBtn) return;
  
  statusEl.textContent = "✅ ";
  const span = document.createElement("span");
  statusEl.appendChild(span);
  
  span.textContent = `${pk.slice(0,4)}…${pk.slice(-4)}`;
  connectBtn.textContent="Disconnect"; 
  
  loadProfile();
}

function uiDisconnected(){ 
  if (!statusEl || !connectBtn) return;
  statusEl.textContent = "Not connected"; 
  connectBtn.textContent="Connect Wallet"; 
}

if (connectBtn) {
  connectBtn.onclick = async ()=> wallet ? disconnect() : connect();
}

async function connect(){
  const p = getWallet();
  if(!p){ 
    alert("Phantom wallet not found. Please install Phantom."); 
    window.open("https://phantom.app","_blank"); 
    return; 
  }
  try {
    const r = await p.connect();
    wallet = r.publicKey.toString();
    uiConnected(wallet);
  } catch (error) {
    console.error("Connection failed:", error);
    alert("Wallet connection failed: " + error.message);
  }
}

async function disconnect(){
  try {
    await getWallet()?.disconnect();
    wallet = null; 
    uiDisconnected();
  } catch (error) {
    console.error("Disconnection failed:", error);
  }
}

/* ---------- Payment (robust confirm) ---------- */
async function pay(amount){
  const p = getWallet();
  if(!p?.publicKey) throw new Error("Please connect wallet first");
  const conn = new solanaWeb3.Connection(RPC, { commitment:"confirmed", confirmTransactionInitialTimeout:120000 });

  const from = p.publicKey;
  const to   = new solanaWeb3.PublicKey(RECEIVER_WALLET);
  const lamports = Math.round(amount * solanaWeb3.LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("finalized");

  const tx = new solanaWeb3.Transaction({
    feePayer: from,
    recentBlockhash: blockhash
  }).add(
    solanaWeb3.SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports })
  );

  const signed = await p.signTransaction(tx);
  const sig = await conn.sendRawTransaction(signed.serialize(), { skipPreflight:false, maxRetries:6 });

  await conn.confirmTransaction({ signature:sig, blockhash, lastValidBlockHeight }, "confirmed");
  return sig;
}

/* ---------- NFT Avatar via Helius ---------- */
async function avatar(pub){
  const cache = localStorage.getItem("a_"+pub);
  if(cache) return cache;

  try {
    const r = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS}`,{
      method:"POST", 
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ 
        jsonrpc:"2.0", 
        id:"nft", 
        method:"getAssetsByOwner", 
        params:{ ownerAddress:pub } 
      })
    });
    
    if (!r.ok) throw new Error("Helius API not available");
    
    const json = await r.json();
    const items = json?.result?.items || [];
    let img = items.find(n=>n?.content?.metadata?.image)?.content?.metadata?.image;
    if(!img) img = items.find(n=>n?.content?.files?.[0]?.uri)?.content?.files?.[0]?.uri || null;

    if(img) localStorage.setItem("a_"+pub, img);
    return img;
  } catch (error) {
    console.error("Error fetching NFT avatar:", error);
    return null;
  }
}

/* ---------- DB ops ---------- */
async function savePost(text, tx){
  const tags = [...text.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase());

  const { error } = await db.from("posts").insert([{ 
    wallet, 
    content:text, 
    tx, 
    tags,
    created_at: new Date().toISOString()
  }]);
  if(error) throw error;
}

/* ---------- VOTING SYSTEM (UPDATED) ---------- */
window.vote = async (id, dir) => {
  if(!wallet) return alert("Please connect your wallet!");

  try {
    const success = await db.rpc(
      dir === "up" ? "vote_up" : "vote_down",
      { p_post_id: id, p_wallet: wallet }
    );

    if(!success.error){
      localStorage.setItem("vote_" + id, dir);
    }

    loadFeed(); 
  } catch (error) {
    console.error("Voting error:", error);
    alert("Voting failed: " + error.message);
  }
};

/* ---------- Feed loading ---------- */
async function loadFeed(tag = null){
  if (!feed || !filterBadge) return;
  
  currentFilter = tag;
  
  if (tag) {
    filterBadge.style.display = 'inline';
    filterBadge.innerHTML = `Filter: #${tag} <span class="clear-filter" style="cursor:pointer;margin-left:8px">✕</span>`;
  } else {
    filterBadge.style.display = 'none';
  }

  let query = db
    .from("posts")
    .select("*, replies(count)")
    .order("created_at", { ascending:false });

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  if (currentSearchTerm) {
    // Inhalt durchsuchen (Case-insensitive)
    query = query.ilike("content", `%${currentSearchTerm}%`);
  }

  if (currentUserFilter) {
    // exakte Wallet-Adresse filtern
    query = query.eq("wallet", currentUserFilter);
  }

  const { data, error } = await query.limit(50);
    
  if (error) { 
    console.error("Supabase load error:", error); 
    return; 
  }

  try {
    const posts = data || [];

    // 🔹 Alle Wallets aus den Posts sammeln
    const wallets = [...new Set(posts.map(p => p.wallet))];

    // 🔹 Levels aus profiles holen
    let levelByWallet = {};
    if (wallets.length > 0) {
      const { data: profileRows, error: profileErr } = await db
        .from("profiles")
        .select("wallet, level")
        .in("wallet", wallets);

      if (!profileErr && profileRows) {
        profileRows.forEach(row => {
          levelByWallet[row.wallet] = row.level || 1;
        });
      }
    }

    // 🔹 Avatare + Level kombinieren
    const postsWithAvatars = await Promise.all(
      posts.map(async p => ({ 
        ...p, 
        img: await avatar(p.wallet),
        level: levelByWallet[p.wallet] || 1
      }))
    );

    const htmlParts = [];
    
    for (const p of postsWithAvatars) {
      const hasNft = !!p.img;
      const userVote = localStorage.getItem("vote_" + p.id);
      const replyCount = p.replies?.[0]?.count || 0;
      const meta = getLevelMeta(p.level);
      const tier = getLevelTier(p.level);
      const levelBadgeHtml = renderLevelBadge(p.level);

      htmlParts.push(`
        <div class="post">
          <div class="avatar ${hasNft ? "nft-halo" : ""}">
            ${p.img ? `<img src="${p.img}" alt="pfp">` : ""}
          </div>
          <div>
            <div class="post-header">
              <div class="wallet-line">
                <div class="wallet-bar level-tier-${tier}" data-wallet="${p.wallet}">
                  ${p.wallet}
                </div>
                ${levelBadgeHtml}
              </div>
              <div class="header-actions">
                <button class="btn-copy" title="Copy address" data-wallet="${p.wallet}">📋</button>
                <button class="btn-profile" title="View profile" data-wallet="${p.wallet}">👤</button>
              </div>
            </div>
            <p style="white-space: pre-line">${renderTextWithTags(p.content)}</p>
            <div class="post-actions">
              
              <span class="vote-btn ${userVote === "up" ? "active-up" : ""}" onclick="vote('${p.id}','up')">
                👍 ${p.upvotes || 0}
              </span>

              <span class="vote-btn ${userVote === "down" ? "active-down" : ""}" onclick="vote('${p.id}','down')">
                👎 ${p.downvotes || 0}
              </span>

              <button class="btn-reply" title="Reply (返信)" data-wallet="${p.wallet}" data-post-id="${p.id}">
                返信 ${replyCount}
              </button>

              <span class="icon-btn sol-btn" onclick="tipUser('${p.wallet}')">
                <img src="/img/1Solana.png" class="sol-icon">
              </span>

              <a target="_blank" class="small" href="https://solscan.io/tx/${p.tx}">
                View TX
              </a>
            </div>
          </div>
        </div>`);
    }

    feed.innerHTML = htmlParts.join("");
    displayWalletLabels();

    const clearBtn = document.querySelector('.clear-filter');
    if (clearBtn) clearBtn.onclick = () => loadFeed();
  } catch (error) {
    console.error("Error loading feed:", error);
    feed.innerHTML = `<div class="post"><p>Error loading posts. Please try again.</p></div>`;
  }
}

/* ---------- Wallet Label Display ---------- */
async function displayWalletLabels() {
  document.querySelectorAll(".wallet-bar").forEach(async el => {
    const wallet = el.dataset.wallet;
    const cache = localStorage.getItem("label_" + wallet);
    if(cache) { 
      el.textContent = cache; 
      return; 
    }

    try {
      const r = await fetch(`https://api.solana.fm/v0/accounts/${wallet}`);
      if (!r.ok) {
        // Wenn API nicht verfügbar, verwende die vollständige Wallet-Adresse
        el.textContent = wallet;
        return;
      }
      
      const json = await r.json();
      const label = json?.result?.account?.accountName || wallet;
      localStorage.setItem("label_" + wallet, label);
      el.textContent = label;
    } catch (error) {
      console.log("⚠️ Solana FM API nicht verfügbar, verwende vollständige Wallet-Adresse");
      // Fallback auf vollständige Wallet-Adresse bei Fehler
      el.textContent = wallet;
    }
  });
}

/* ---------- Tip User ---------- */
async function tipUser(toWallet) {
  if(!wallet) return alert("Please connect your wallet!");
  try {
    const sig = await pay(0.001);
    alert(`Tip sent! TX: ${sig}`);
  } catch(e) {
    alert("Tip failed: " + e.message);
  }
}

/* ---------- Posting ---------- */
if (postBtn && postText) {
  postBtn.onclick = async ()=>{
    if(!wallet) return alert("Please connect your wallet!");
    const text = postText.value.trim();
    if(!text) return alert("Please enter some text");
    if(text.length > 140) return alert("Max 140 characters");

    try {
      const originalText = postBtn.textContent;
      postBtn.textContent = "Sending 0.001 SOL...";
      postBtn.disabled = true;

      const sig = await pay(0.001);
      await savePost(text, sig);
      
      await new Promise(r => setTimeout(r, 300));
      
      postText.value = "";
      
      await loadFeed();
      
      if (boomSound) boomSound.play().catch(e => console.log("Boom sound failed"));
      
      setTimeout(() => {
        const posts = document.querySelectorAll('.post');
        if(posts.length > 0) {
          posts[0].classList.add('post-boom');
        }
      }, 100);

      alert("✅ Posted successfully!");

    } catch(e) {
      alert("Post failed: " + e.message);
    } finally {
      postBtn.textContent = "Post";
      postBtn.disabled = false;
    }
  };
}

/* ---------- Trending Hashtags ---------- */
async function updateTrends(){
  if (!trendBox) return;
  
  const { data } = await db.from("posts").select("tags");
  const allTags = (data || []).flatMap(p => p.tags || []);
  const counts = {};
  allTags.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0,5);

  if(sorted.length === 0) return;

  trendBox.innerHTML = sorted.map(([tag,count]) => `
    <div class="trend-item" onclick="loadFeed('${tag}')">
      #${tag} <span class="trend-count">${count}</span>
    </div>`).join("");
}

/* ---------- Realtime Trending Hashtags --- */
function updateTrendingFeed(newHashtag) {
  const list = document.querySelector('#trending-list');
  if (!list || !newHashtag?.tag) return;

  const existing = list.querySelector(`[data-tag="${newHashtag.tag}"]`);
  
  if (existing) {
    const countElem = existing.querySelector('.count');
    const oldCount = parseInt(countElem.textContent, 10);
    countElem.textContent = newHashtag.count;

    if (oldCount !== newHashtag.count) {
      existing.classList.remove('trend-updated');
      void existing.offsetWidth;
      existing.classList.add('trend-updated');
    }
  } else {
    const li = document.createElement('li');
    li.dataset.tag = newHashtag.tag;
    li.innerHTML = `${newHashtag.tag} <span class="count">${newHashtag.count}</span>`;
    li.classList.add('trend-added');
    list.prepend(li);
  }
}

// Supabase Realtime für Trending Hashtags
try {
  const hashtagChannel = db
    .channel('trending-hashtags')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'hashtags' },
      payload => {
        console.log('📊 Realtime hashtag update:', payload);
        updateTrendingFeed(payload.new);
      }
    )
    .subscribe();
} catch (error) {
  console.log("Realtime hashtags not available");
}

/* ---------- Hashtag Click Handler ---------- */
document.addEventListener("click", e => {
  if(e.target.classList.contains("hashtag")){
    const tag = e.target.dataset.tag;
    loadFeed(tag);
  }
});

/* === Debounce Helper === */
function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ---------- Search & Filter Events ---------- */
if (searchPostsInput) {
  searchPostsInput.addEventListener("input", debounce(e => {
    currentSearchTerm = e.target.value.trim();
    loadFeed(currentFilter);
  }));
}

if (filterUserInput) {
  filterUserInput.addEventListener("input", debounce(e => {
    currentUserFilter = e.target.value.trim();
    loadFeed(currentFilter);
  }));
}

/* ---------- Reset Feed ---------- */
if (resetFeedBtn) {
  resetFeedBtn.onclick = () => {
    currentFilter = null;
    currentSearchTerm = "";
    currentUserFilter = "";

    if (searchPostsInput) searchPostsInput.value = "";
    if (filterUserInput) filterUserInput.value = "";

    loadFeed();
  };
}

/* ---------- Profile Modal ---------- */
const profileLink = document.querySelector(".profile-link");
if (profileLink) {
  profileLink.onclick = async () => {
    if (!wallet) {
      alert("Please connect your wallet first!");
      return;
    }

    await loadProfile();

    const profileModal = document.getElementById("profileModal");
    if (profileModal) profileModal.style.display = "block";
  };
}

function closeProfile() {
  const profileModal = document.getElementById("profileModal");
  if (profileModal) profileModal.style.display = "none";
}

/* === Toast Notification Utility === */
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, 2000);
}

/* ---------- Neue Button-Funktionen ---------- */
document.addEventListener('click', e => {
  // Copy wallet to clipboard
  if (e.target.classList.contains('btn-copy')) {
    const wallet = e.target.dataset.wallet;
    navigator.clipboard.writeText(wallet).then(() => {
      e.target.textContent = '✅';
      setTimeout(() => (e.target.textContent = '📋'), 1000);
    }).catch(err => {
      console.error('Copy failed:', err);
      e.target.textContent = '❌';
      setTimeout(() => (e.target.textContent = '📋'), 1000);
    });
  }

  // Open profile modal (eigenes Profil oder fremdes Profil in View-Mode)
  if (e.target.classList.contains('btn-profile')) {
    const targetWallet = e.target.dataset.wallet;

    if (targetWallet === window.wallet) {
      // eigenes Profil -> normaler Edit-Modus
      document.querySelector(".profile-link")?.click();
    } else {
      openUserProfile(targetWallet);
    }
  }
});

/* ---------- HENSHIN Reply Logic ---------- */
const replyModal = document.getElementById('replyModal');
const replyText = document.getElementById('replyText');
const charCount = document.getElementById('charCount');
const cancelReply = document.getElementById('cancelReply');
const sendReply = document.getElementById('sendReply');

let replyTarget = null;

// Öffnen beim Klick auf 「返信」
document.addEventListener('click', e => {
  if (e.target.classList.contains('btn-reply')) {
    replyTarget = e.target.dataset.postId;
    if (replyModal) {
      replyModal.classList.remove('hidden');
      if (replyText) {
        replyText.value = '';
        replyText.focus();
      }
      if (charCount) charCount.textContent = '0 / 140';
    }
  }
});

// Zeichen zählen
if (replyText && charCount) {
  replyText.addEventListener('input', () => {
    charCount.textContent = `${replyText.value.length} / 140`;
  });
}

// Abbrechen
if (cancelReply) {
  cancelReply.addEventListener('click', () => {
    if (replyModal) replyModal.classList.add('hidden');
  });
}

// Absenden
if (sendReply) {
  sendReply.addEventListener('click', async () => {
    if (!replyText) return;
    
    const text = replyText.value.trim();
    if (!text) return alert('Empty reply!');
    if (text.length > 140) return alert('Too long!');
    
    if (!wallet) {
      alert("Please connect your wallet first!");
      return;
    }

    if (replyModal) replyModal.classList.add('hidden');

    try {
      const { data, error } = await db
        .from('replies')
        .insert([{ 
          post_id: replyTarget, 
          wallet, 
          content: text,
          created_at: new Date().toISOString()
        }])
        .select();

      if (error) {
        console.error(error);
        toast('❌ Error sending reply');
        return;
      }

      toast('🌀 Reply sent!');
      
      await loadFeed();
      
      showRepliesForPost(replyTarget);
      
    } catch (err) {
      console.error('Error saving reply:', err);
      toast('❌ Error sending reply');
    }
  });
}

/* ---------- Reply Panel Logic ---------- */
const replyPanel = document.getElementById('replyPanel');
const closeReplies = document.getElementById('closeReplies');

async function showRepliesForPost(postId) {
  const list = document.getElementById('replyList');
  if (!list) return;

  const { data, error } = await db
    .from('replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  list.innerHTML = data.map(r => `
    <div class="reply-item">
      <div class="reply-author">${r.wallet.slice(0,6)}...</div>
      <div class="reply-text">${r.content}</div>
      <div class="reply-time">${new Date(r.created_at).toLocaleString()}</div>
    </div>
  `).join('');

  if (replyPanel) {
    replyPanel.classList.remove('hidden');
    replyPanel.classList.add('show');
  }
}

// X-Button klick
if (closeReplies && replyPanel) {
  closeReplies.addEventListener('click', () => {
    replyPanel.classList.remove('show');
    setTimeout(() => replyPanel.classList.add('hidden'), 400);
  });
}

// Klick außerhalb schließt Panel
document.addEventListener('click', (e) => {
  if (e.target === replyPanel) {
    replyPanel.classList.remove('show');
    setTimeout(() => replyPanel.classList.add('hidden'), 400);
  }
});

/* ---------- Init ---------- */
loadFeed();
updateTrends();
setInterval(updateTrends, 30000);

// Auto-connect if previously connected
window.addEventListener("load", async ()=>{
  const p = getWallet();
  if(p?.isConnected && p.publicKey){
    wallet = p.publicKey.toString();
    uiConnected(wallet);
  }
});

/* === 🧩 Easter Egg: Triple Click on Logo === */
const logo = document.querySelector(".logo-anim");
const rick = document.getElementById("rick");
const portal = document.getElementById("portal");
const rickText = document.getElementById("rick-text");
const rickSound = document.getElementById("rickSound");

// Debugging: Prüfe ob alle Elemente existieren
console.log("Easter Egg Elements:", { logo, rick, portal, rickText, rickSound });

let clickCount = 0;
let clickTimer = null;

if (logo && rick && portal && rickText) {
  logo.style.cursor = "pointer"; // Visueller Hinweis
  
  logo.addEventListener("click", (e) => {
    e.preventDefault();
    
    // Reset Timer bei jedem Klick
    if (clickTimer) {
      clearTimeout(clickTimer);
    }
    
    clickCount++;
    console.log(`Logo clicked ${clickCount} times`);
    
    if (clickCount === 3) {
      console.log("🎉 Easter Egg triggered!");
      triggerRickEasterEgg();
      clickCount = 0;
    }
    
    // Reset Counter nach 1.2 Sekunden
    clickTimer = setTimeout(() => {
      clickCount = 0;
      console.log("Click counter reset");
    }, 1200);
  });
} else {
  console.error("❌ Easter Egg elements missing!");
}

function triggerRickEasterEgg() {
  if (!rickSound || !rick || !portal || !rickText) {
    console.error("Missing Easter Egg elements");
    return;
  }
  
  try {
    // Reset alle Animationen und Stile
    resetEasterEgg();
    
    // Sound abspielen
    rickSound.currentTime = 0;
    rickSound.volume = 0.7;
    rickSound.play().catch(e => console.log("Rick sound play failed:", e));
    
    // Portal Animation
    portal.style.display = "block";
    portal.style.opacity = "1";
    portal.style.animation = "portalOpen 2.8s ease-out, portalGlow 3s ease-in-out infinite";
    
    // Rick Animation mit Verzögerung
    setTimeout(() => {
      rick.style.display = "block";
      rick.style.opacity = "1";
      rick.style.animation = "rickFlyAndWobble 6s ease-in-out forwards";
    }, 300);
    
    // Text Animation
    setTimeout(() => {
      rickText.style.display = "block";
      rickText.style.opacity = "1";
      rickText.textContent = "Never go into Crypto, Morty!";
    }, 2300);
    
    // Text ausblenden
    setTimeout(() => {
      rickText.style.opacity = "0";
    }, 5300);
    
    // Alles ausblenden nach 7 Sekunden
    setTimeout(() => {
      resetEasterEgg();
    }, 7000);
    
  } catch (error) {
    console.error("Easter Egg error:", error);
  }
}

function resetEasterEgg() {
  // Reset Portal
  if (portal) {
    portal.style.animation = "none";
    portal.style.opacity = "0";
    portal.style.display = "none";
  }
  
  // Reset Rick
  if (rick) {
    rick.style.animation = "none";
    rick.style.opacity = "0";
    rick.style.display = "none";
  }
  
  // Reset Text
  if (rickText) {
    rickText.style.opacity = "0";
    rickText.style.display = "none";
  }
}
