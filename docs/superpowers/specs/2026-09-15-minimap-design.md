# Minimap Arrow + Expand Design — 2026-09-15

## 1. Arrow cong cao
- Path mới: `M650 190 C560 85 430 85 285 188` vòng cung cao kiểu máy bay giấy, thay cho đường ngang cũ.
- Style: stroke var(--red) width 5, dash 7 7, marker arrow, `filter: drop-shadow`.
- Animate: draw-in via stroke-dashoffset on `.is-route-active` + marching ants loop + pin bounce `map-pin-bounce .9s`.

## 2. Expand fullscreen FLIP
- Click `#campusMap` mở `#mapOverlay` fullscreen: backdrop `rgba(10,6,3,.72)+blur(7px)`, card giấy kraft lớn chứa clone SVG scale to.
- Transition: GSAP FLIP — đo rect minimap, scale từ rect lên center, `expo.out .65s`. Đóng (X/ESC/backdrop) reverse về.
- Overlay có tilt 3D nhẹ theo chuột (max 6deg), nút Chỉ đường + caption giữ vibe sticker.
- Reduced-motion: tắt FLIP/tilt, hiện/ẩn tức thì. ESC + focus trap cơ bản.
