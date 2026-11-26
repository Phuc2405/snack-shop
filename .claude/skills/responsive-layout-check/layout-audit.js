// Layout audit — dán vào DevTools Console, hoặc chạy qua công cụ javascript của Claude in Chrome.
// Trả về object JSON liệt kê vấn đề layout ở kích thước cửa sổ HIỆN TẠI.
// Chạy lại sau mỗi lần đổi kích thước / zoom (xem SKILL.md cho danh sách kích thước).
(() => {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  // Phần tử "chỉ dành cho trình đọc màn hình" (.sr-only: 1×1px, clip) — bỏ qua, không phải lỗi
  const srOnly = (el) => {
    for (let e = el; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.position === 'absolute' && parseFloat(cs.width) <= 1 && parseFloat(cs.height) <= 1) return true;
      if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath === 'inset(50%)') return true;
    }
    return false;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' &&
      !el.closest('[aria-hidden="true"],dialog:not([open]),[popover]:not(:popover-open)') && !srOnly(el)
    );
  };
  const label = (el) =>
    (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
  const path = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 4; e = e.parentElement) {
      parts.unshift(e.tagName.toLowerCase() + (e.id ? `#${e.id}` : ''));
    }
    return parts.join('>');
  };

  // 1. Cuộn ngang toàn trang (lỗi phổ biến nhất trên điện thoại)
  const pageOverflowX = document.documentElement.scrollWidth - vw;

  // 2. Phần tử tràn ra ngoài mép phải/trái màn hình (trừ vùng cuộn ngang có chủ đích)
  const overflowing = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      const scroller = el.parentElement?.closest('*');
      let inScroller = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') { inScroller = true; break; }
      }
      if (!inScroller && scroller) overflowing.push({ el: path(el), left: Math.round(r.left), right: Math.round(r.right) });
    }
  }

  // 3. Vùng chạm quá nhỏ (< 44×44 CSS px — WCAG 2.5.5 / Apple HIG). Link trong đoạn văn được miễn.
  const smallTargets = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=switch], [role=tab]')) {
    if (!visible(el) || el.disabled) continue;
    if (el.tagName === 'A' && el.closest('p, li') && getComputedStyle(el).display === 'inline') continue;
    // "Stretched link/button": ::after phủ cả thẻ cha → vùng bấm thật là thẻ cha có position
    const after = getComputedStyle(el, '::after');
    const stretched = after.content !== 'none' && after.position === 'absolute';
    let target = el.matches('input[type=checkbox], input[type=radio]') ? el.closest('label') ?? el : el;
    if (stretched) {
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (getComputedStyle(p).position !== 'static') { target = p; break; }
      }
    }
    const r = target.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) smallTargets.push({ el: label(el), w: Math.round(r.width), h: Math.round(r.height) });
  }

  // 4. Chữ quá nhỏ (< 14px) — khách lớn tuổi khó đọc
  const tinyText = new Set();
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 14) tinyText.add(`${label(el)} (${fs}px)`);
  }

  // 5. Chữ bị cắt mà KHÔNG có dấu "…" (overflow ẩn, nội dung dài hơn hộp)
  const clipped = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const hides = cs.overflow === 'hidden' || cs.overflowX === 'hidden' || cs.overflow === 'clip';
    if (!hides || cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') continue;
    if (el.scrollWidth > el.clientWidth + 2 && el.textContent.trim() && !el.querySelector('img,svg')) {
      clipped.push(path(el));
    }
  }

  // 6. Ảnh thiếu alt / không có kích thước cố định (gây nhảy layout — CLS)
  const imgIssues = [...document.images]
    .filter(visible)
    .filter((i) => !i.hasAttribute('alt') || (!i.getAttribute('width') && getComputedStyle(i.parentElement).aspectRatio === 'auto' && !i.closest('[class*="aspect-"]')))
    .map((i) => i.src.slice(-40));

  // 7. Phần tử fixed/sticky che quá nhiều màn hình (> 35% chiều cao)
  const coverage = [];
  for (const el of document.body.querySelectorAll('*')) {
    const pos = getComputedStyle(el).position;
    if ((pos === 'fixed' || pos === 'sticky') && visible(el)) {
      const r = el.getBoundingClientRect();
      const top = Math.max(0, r.top), bottom = Math.min(vh, r.bottom);
      const share = Math.max(0, bottom - top) / vh;
      // Chỉ tính thanh rộng ngang màn hình (cột sticky bên cạnh nội dung không che gì)
      if (share > 0.35 && r.width > vw * 0.6 && !el.closest('dialog')) coverage.push({ el: path(el), share: `${Math.round(share * 100)}%` });
    }
  }

  return {
    viewport: `${vw}×${vh}`,
    dpr: window.devicePixelRatio,
    pageOverflowX,
    overflowing: overflowing.slice(0, 10),
    smallTargets: smallTargets.slice(0, 15),
    tinyText: [...tinyText].slice(0, 10),
    clipped: clipped.slice(0, 10),
    imgIssues: imgIssues.slice(0, 10),
    stickyCoverage: coverage,
    ok: pageOverflowX <= 0 && !overflowing.length && !smallTargets.length && !clipped.length && !coverage.length,
  };
})();
