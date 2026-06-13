export const CSS = `
::highlight(penumbra) { background: rgba(255, 214, 102, 0.40); }
::highlight(penumbra-active) { background: rgba(255, 184, 77, 0.75); }

[data-pen-ui] { font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; box-sizing: border-box; }
[data-pen-ui] * { box-sizing: border-box; }

.pen-addbtn {
  position: absolute; z-index: 2147483646; transform: translate(-50%, -120%);
  background: #1a1a1a; color: #fff; border: none; border-radius: 6px;
  padding: 6px 10px; font-size: 13px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.25);
}
.pen-addbtn:hover { background: #000; }

.pen-card {
  position: absolute; z-index: 2147483646; width: 300px; max-width: 86vw;
  background: #fff; border: 1px solid #e2e2e2; border-radius: 10px;
  box-shadow: 0 6px 28px rgba(0,0,0,.18); padding: 12px;
}
.pen-card textarea {
  width: 100%; min-height: 64px; resize: vertical; border: 1px solid #ddd;
  border-radius: 6px; padding: 8px; font: inherit;
}
.pen-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 8px; }
.pen-btn { background: #1a1a1a; color: #fff; border: none; border-radius: 6px; padding: 7px 12px; cursor: pointer; font-size: 13px; }
.pen-btn:hover { background: #000; }
.pen-btn.secondary { background: #f0f0f0; color: #333; }
.pen-btn.secondary:hover { background: #e6e6e6; }
.pen-quote { font-size: 12px; color: #888; border-left: 3px solid #ffd666; padding-left: 8px; margin-bottom: 8px; max-height: 48px; overflow: hidden; }

.pen-comment { margin-bottom: 10px; }
.pen-comment:last-child { margin-bottom: 0; }
.pen-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #666; margin-bottom: 3px; }
.pen-meta img { width: 18px; height: 18px; border-radius: 50%; }
.pen-meta .pen-name { font-weight: 600; color: #333; }
.pen-body { white-space: pre-wrap; }
.pen-actions { margin-top: 6px; display: flex; gap: 10px; }
.pen-actions a { font-size: 12px; color: #c47f00; cursor: pointer; text-decoration: none; }
.pen-actions a:hover { text-decoration: underline; }

.pen-login {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483645;
  background: #fff; border: 1px solid #e2e2e2; border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,.14); padding: 10px 12px;
}
.pen-login .pen-providers { display: flex; gap: 6px; margin-top: 6px; }
.pen-login .pen-title { font-size: 12px; color: #666; }
.pen-login .pen-name { font-weight: 600; }
.pen-login input { border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font: inherit; width: 160px; }

.pen-gutter-dot {
  position: absolute; left: 0; width: 12px; height: 12px; border-radius: 50%;
  background: #ffd666; border: 2px solid #c47f00; cursor: pointer; z-index: 2147483644;
}
`
