// NeoValues Share Card, URL Permalinks, & Top-5 Closest Matches Helper
const NVShare = {
    paramMap: {
        economics: 'e',
        resource_management: 'r',
        culture: 'c',
        authority: 'a',
        nation: 'n',
        foreign: 'f',
        technology: 't',
        social_control: 's',
        territorial_organization: 'o'
    },

    readUrlResults() {
        const params = new URLSearchParams(window.location.search);
        const parsed = {};
        let foundAny = false;

        for (const [cat, shortKey] of Object.entries(this.paramMap)) {
            const val = params.get(shortKey);
            if (val && typeof categoryValues !== 'undefined' && categoryValues[cat]?.includes(val)) {
                parsed[cat] = val;
                foundAny = true;
            }
        }
        return foundAny ? parsed : null;
    },

    buildShareUrl(resultsObj, page = 'results.html') {
        const url = new URL(page, window.location.href);
        url.search = '';
        for (const [cat, shortKey] of Object.entries(this.paramMap)) {
            if (resultsObj && resultsObj[cat]) {
                url.searchParams.set(shortKey, resultsObj[cat]);
            }
        }
        return url.toString();
    },

    syncAddressBar(resultsObj) {
        if (!resultsObj || Object.keys(resultsObj).length === 0) {
            window.history.replaceState(null, '', window.location.pathname);
            return;
        }
        const url = new URL(window.location.href);
        url.search = '';
        for (const [cat, shortKey] of Object.entries(this.paramMap)) {
            if (resultsObj[cat]) {
                url.searchParams.set(shortKey, resultsObj[cat]);
            }
        }
        window.history.replaceState(null, '', url.toString());
    },

    async copyShareLink(resultsObj, btnEl) {
        const shareUrl = this.buildShareUrl(resultsObj, 'results.html');
        try {
            await navigator.clipboard.writeText(shareUrl);
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = shareUrl;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        if (btnEl) {
            const orig = btnEl.innerText;
            btnEl.innerText = (typeof I18n !== 'undefined') ? I18n.t("linkCopied") : "Link Copied!";
            setTimeout(() => {
                btnEl.innerText = (typeof I18n !== 'undefined') ? I18n.t("copyLink") : orig;
            }, 1800);
        }
    },

    renderTopMatches(containerId, scoredLabels) {
        const wrapper = document.getElementById(containerId);
        if (!wrapper) return;
        wrapper.innerHTML = '';

        const top5 = (scoredLabels || []).filter(x => x.matchPercentage > 0).slice(0, 5);
        if (top5.length === 0) {
            wrapper.style.display = 'none';
            return;
        }
        wrapper.style.display = 'flex';

        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'top-matches-toggle';
        const titleText = (typeof I18n !== 'undefined') ? I18n.t("topMatches") : "Top 5 Closest Ideologies";
        toggleBtn.innerHTML = `<span>${titleText}</span> <span class="chevron">▾</span>`;

        const drawer = document.createElement('div');
        drawer.className = 'top-matches-drawer';

        top5.forEach(item => {
            const row = document.createElement('a');
            row.className = 'top-match-row';
            row.href = `description.html?id=${encodeURIComponent(item.label)}&type=ideology`;

            const color = (typeof labelColors !== 'undefined' && labelColors[item.label]) || '#7a7a7a';
            const displayName = (typeof I18n !== 'undefined') ? I18n.getIdeologyName(item.label) : item.label;
            const pct = Math.max(0, Math.min(100, item.matchPercentage));

            row.innerHTML = `
                <div class="top-match-header">
                    <span class="top-match-name">
                        <span class="top-match-dot" style="background:${color}"></span>
                        ${displayName}
                    </span>
                    <span class="top-match-meta">${pct}% (${item.identicalCount}/${item.totalRequired})</span>
                </div>
                <div class="top-match-bar-bg">
                    <div class="top-match-bar-fill" style="width:${pct}%; background:${color}"></div>
                </div>
            `;
            drawer.appendChild(row);
        });

        toggleBtn.onclick = () => {
            const isOpen = drawer.classList.toggle('open');
            toggleBtn.classList.toggle('open', isOpen);
        };

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(drawer);
    },

    normalizeColor(hex) {
        if (!hex) return '#5C5C5C';
        if (hex.startsWith('#') && hex.length === 9) {
            return hex.slice(0, 7);
        }
        return hex;
    },

    roundRect(ctx, x, y, w, h, r) {
        const rad = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
    },

    wrapLines(ctx, text, maxWidth) {
        const words = String(text || '').split(/\s+/);
        const lines = [];
        let cur = '';
        for (const w of words) {
            const test = cur ? `${cur} ${w}` : w;
            if (ctx.measureText(test).width <= maxWidth || !cur) {
                cur = test;
            } else {
                lines.push(cur);
                cur = w;
            }
        }
        if (cur) lines.push(cur);
        return lines.slice(0, 2);
    },

    loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    },

    async downloadShareCard(resultsObj, finalLabel, nextMatchObj) {
        if (!resultsObj || Object.keys(resultsObj).length === 0) return;

        if (document.fonts && document.fonts.ready) {
            try { await document.fonts.ready; } catch (e) {}
        }

        const W = 1200;
        const H = 1520;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#18181b';
        ctx.fillRect(0, 0, W, H);

        // Subtle inner card frame
        this.roundRect(ctx, 36, 36, W - 72, H - 72, 34);
        ctx.fillStyle = '#1e1e22';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.stroke();

        // Title: NeoValues v4.4
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f4f4f5';
        ctx.font = "700 78px 'Quicksand', 'Nunito', sans-serif";
        ctx.fillText('NeoValues', W / 2 - 26, 148);

        const titleWidth = ctx.measureText('NeoValues').width;
        ctx.fillStyle = '#a1a1aa';
        ctx.font = "600 28px 'Quicksand', 'Nunito', sans-serif";
        ctx.textAlign = 'left';
        ctx.fillText('v4.4', W / 2 - 26 + titleWidth / 2 + 14, 118);

        // Load all 9 icons in parallel
        const cats = (typeof categories !== 'undefined') ? categories : Object.keys(this.paramMap);
        const imgs = await Promise.all(cats.map(cat => {
            const val = resultsObj[cat];
            return val ? this.loadImage(`icons/${cat}/${val}.svg`) : Promise.resolve(null);
        }));

        // Draw 3x3 Grid
        const cols = 3;
        const colSpacing = 330;
        const rowSpacing = 315;
        const startX = W / 2 - colSpacing;
        const startY = 285;
        const iconSize = 172;

        cats.forEach((cat, idx) => {
            const col = idx % cols;
            const row = Math.floor(idx / cols);
            const cx = startX + col * colSpacing;
            const cy = startY + row * rowSpacing;
            const val = resultsObj[cat];

            // Category small header above icon
            const catTitle = (typeof I18n !== 'undefined') ? I18n.getCategoryTitle(cat) : cat;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#71717a';
            ctx.font = "700 16px 'Nunito', sans-serif";
            ctx.fillText(catTitle.toUpperCase(), cx, cy - iconSize / 2 - 16);

            const img = imgs[idx];
            if (img) {
                ctx.save();
                ctx.shadowColor = 'rgba(0,0,0,0.45)';
                ctx.shadowBlur = 18;
                ctx.shadowOffsetY = 6;
                ctx.beginPath();
                ctx.arc(cx, cy, iconSize / 2, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStyle = '#18181b';
                ctx.fill();
                ctx.restore();

                ctx.drawImage(img, cx - iconSize / 2, cy - iconSize / 2, iconSize, iconSize);
            } else {
                ctx.beginPath();
                ctx.arc(cx, cy, iconSize / 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 4;
                ctx.stroke();
            }

            // Value label below icon
            const valLabel = val
                ? ((typeof I18n !== 'undefined') ? I18n.getValueName(cat, val) : val.replace(/_/g, ' '))
                : '—';
            ctx.fillStyle = '#e4e4e7';
            ctx.font = "700 22px 'Quicksand', 'Nunito', sans-serif";
            const lines = this.wrapLines(ctx, valLabel.toUpperCase(), 290);
            lines.forEach((line, lIdx) => {
                ctx.fillText(line, cx, cy + iconSize / 2 + 34 + lIdx * 27);
            });
        });

        // Primary Matched Ideology Pill
        const dispIdeology = (finalLabel && finalLabel !== 'No exact match')
            ? ((typeof I18n !== 'undefined') ? I18n.getIdeologyName(finalLabel) : finalLabel)
            : ((typeof I18n !== 'undefined') ? I18n.t("noExactMatch") : 'No exact match');

        ctx.font = "700 50px 'Quicksand', 'Nunito', sans-serif";
        const pillW = Math.min(W - 160, Math.max(540, ctx.measureText(dispIdeology).width + 130));
        const pillH = 108;
        const pillX = (W - pillW) / 2;
        const pillY = 1205;

        ctx.fillStyle = this.normalizeColor((typeof labelColors !== 'undefined' && labelColors[finalLabel]) || '#5C5C5C');
        this.roundRect(ctx, pillX, pillY, pillW, pillH, 54);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(dispIdeology, W / 2, pillY + pillH / 2 + 2);

        // Next Closest Match Pill
        if (nextMatchObj && nextMatchObj.label) {
            const nextName = (typeof I18n !== 'undefined')
                ? I18n.getIdeologyName(nextMatchObj.label)
                : nextMatchObj.label;
            const prefix = (typeof I18n !== 'undefined') ? I18n.t("nextClosestMatch") : "Next closest match";
            const subText = `${prefix}: ${nextName} (${nextMatchObj.identicalCount}/${nextMatchObj.totalRequired})`;

            ctx.font = "600 25px 'Quicksand', 'Nunito', sans-serif";
            const subW = Math.min(W - 160, ctx.measureText(subText).width + 76);
            const subH = 58;
            const subX = (W - subW) / 2;
            const subY = pillY + pillH + 28;
            const subCol = this.normalizeColor((typeof labelColors !== 'undefined' && labelColors[nextMatchObj.label]) || '#a1a1aa');

            this.roundRect(ctx, subX, subY, subW, subH, 29);
            ctx.strokeStyle = subCol;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            ctx.fillStyle = '#d4d4d8';
            ctx.fillText(subText, W / 2, subY + subH / 2 + 1);
        }

        // Subtle Footer
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#52525b';
        ctx.font = "600 18px 'Nunito', sans-serif";
        ctx.fillText('PolishLithuanianCommonwealth / NeoValues', W / 2, H - 58);

        const slug = String(finalLabel || 'results').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        const link = document.createElement('a');
        link.download = `neovalues_${slug || 'results'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
};
