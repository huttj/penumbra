"use strict";(()=>{var b="penumbra:token",u=class{constructor(e){this.base=e}get token(){return localStorage.getItem(b)}set token(e){e?localStorage.setItem(b,e):localStorage.removeItem(b)}headers(e=!1){let n={};return e&&(n["Content-Type"]="application/json"),this.token&&(n.Authorization=`Bearer ${this.token}`),n}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let n=await e.json();return{user:n.user,isAuthor:!!n.isAuthor}}async list(e,n=[]){let t=new URLSearchParams({source:e});n.length&&t.set("include",n.join(","));let o=await fetch(`${this.base}/annotations?${t}`);return o.ok?(await o.json()).items:[]}async create(e,n,t={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:t.kind??"comment",body:[{type:"TextualBody",value:n}],docVersion:t.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,n){let t=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${t}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:n})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,n){let t=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${t}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(n)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let n=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${n}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let n=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return n.ok?(await n.json()).response:null}async saveResponse(e,n,t,o){let r=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:n,quotes:t,sourceSha:o})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??`save failed (${r.status})`);return r.json()}async getAllResponses(e){let n=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return n.ok?(await n.json()).responses:[]}async submitResponse(e){let n=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),t=await n.json().catch(()=>({}));if(!n.ok)throw new Error(t.error??`submit failed (${n.status})`);return t}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function v(s){let e=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode(r){let i=r.parentElement;return i&&i.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),n=[],t="",o;for(;o=e.nextNode();){let r=o,i=t.length;t+=r.data,n.push({node:r,start:i,end:t.length})}return{text:t,nodes:n}}function E(s,e){for(let t of s.nodes)if(e>=t.start&&e<=t.end)return{node:t.node,offset:e-t.start};let n=s.nodes[s.nodes.length-1];return n?{node:n.node,offset:n.node.data.length}:null}function S(s,e,n){if(e.nodeType===Node.TEXT_NODE){let r=s.nodes.find(i=>i.node===e);return r?r.start+n:null}let t=e.childNodes[n]??e.childNodes[e.childNodes.length-1];if(!t)return null;let o=s.nodes.find(r=>r.node===t||t.contains(r.node));return o?o.start:null}function T(s,e){let n=v(e),t=S(n,s.startContainer,s.startOffset),o=S(n,s.endContainer,s.endOffset);if(t==null||o==null||o<=t)return null;let r=n.text.slice(t,o),i=n.text.slice(Math.max(0,t-32),t),a=n.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:r,prefix:i,suffix:a},{type:"TextPositionSelector",start:t,end:o}]}function h(s,e){let n=s.find(l=>l.type==="TextQuoteSelector");if(!n?.exact)return null;let t=v(e),o=j(t.text,n);if(o<0)return null;let r=E(t,o),i=E(t,o+n.exact.length);if(!r||!i)return null;let a=document.createRange();return a.setStart(r.node,r.offset),a.setEnd(i.node,i.offset),a}function L(s,e){let n=s.trim();if(n.length<8)return null;let t=v(e),o=t.text.indexOf(n);return o<0?null:[{type:"TextQuoteSelector",exact:n,prefix:t.text.slice(Math.max(0,o-32),o),suffix:t.text.slice(o+n.length,o+n.length+32)},{type:"TextPositionSelector",start:o,end:o+n.length}]}function j(s,e){let n=[],t=s.indexOf(e.exact);for(;t>=0;)n.push(t),t=s.indexOf(e.exact,t+1);if(n.length===0)return-1;if(n.length===1)return n[0];let o=n[0],r=-1;for(let i of n){let a=0;if(e.prefix){let l=s.slice(Math.max(0,i-e.prefix.length),i);a+=B(l,e.prefix)}if(e.suffix){let l=s.slice(i+e.exact.length,i+e.exact.length+e.suffix.length);a+=N(l,e.suffix)}a>r&&(r=a,o=i)}return o}var N=(s,e)=>{let n=0;for(;n<s.length&&n<e.length&&s[n]===e[n];)n++;return n},B=(s,e)=>{let n=0;for(;n<s.length&&n<e.length&&s[s.length-1-n]===e[e.length-1-n];)n++;return n};var R=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function $(s){let e=[],n=[];for(let t of(s??"").split(`
`))/^\s*>/.test(t)?n.push(t.replace(/^\s*>\s?/,"")):n.length&&(e.push(n.join(" ").trim()),n=[]);return n.length&&e.push(n.join(" ").trim()),e.filter(t=>t.length>=6)}var x=s=>/^\s*>/.test(s??"");function C(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),n=0,t=[];for(;n<e.length&&!x(e[n]);)t.push(e[n]),n++;let o=[];for(;n<e.length;){let r=[];for(;n<e.length&&x(e[n]);)r.push(e[n].replace(/^\s*>\s?/,"")),n++;let i=[];for(;n<e.length&&!x(e[n]);)i.push(e[n]),n++;o.push({quotes:[r.join(" ").trim()],note:i.join(`
`).trim()})}return{preamble:t.join(`
`).trim(),blocks:o}}function q(s,e){let n=[];s.trim()&&n.push(s.trim());for(let t of e){if(!t.quotes.length&&!t.note.trim())continue;let o=t.quotes.map(r=>`> ${r.replace(/\n/g," ")}`).join(`
>
`);n.push(t.note.trim()?`${o}

${t.note.trim()}`:o)}return n.join(`

`)+`
`}function w(s){let e=s.trim();return e?e.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍\s]/gu,"")===""&&/\p{Extended_Pictographic}/u.test(e):!1}function g(s){return R(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function d(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),n=[],t=0;for(;t<e.length;){let o=e[t];if(/^```/.test(o)){let i=[];for(t++;t<e.length&&!/^```/.test(e[t]);)i.push(e[t++]);t++,n.push(`<pre><code>${R(i.join(`
`))}</code></pre>`);continue}if(/^\s*$/.test(o)){t++;continue}if(/^#{1,6}\s/.test(o)){let i=/^(#{1,6})\s+(.*)$/.exec(o);n.push(`<h${i[1].length}>${g(i[2])}</h${i[1].length}>`),t++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(o)){n.push("<hr>"),t++;continue}if(/^\s*>/.test(o)){let i=[];for(;t<e.length&&/^\s*>/.test(e[t]);)i.push(e[t++].replace(/^\s*>\s?/,""));n.push(`<blockquote>${d(i.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(o)){let i=[];for(;t<e.length&&/^\s*[-*+]\s/.test(e[t]);)i.push(`<li>${g(e[t++].replace(/^\s*[-*+]\s+/,""))}</li>`);n.push(`<ul>${i.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(o)){let i=[];for(;t<e.length&&/^\s*\d+\.\s/.test(e[t]);)i.push(`<li>${g(e[t++].replace(/^\s*\d+\.\s+/,""))}</li>`);n.push(`<ol>${i.join("")}</ol>`);continue}let r=[];for(;t<e.length&&!/^\s*$/.test(e[t])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[t]);)r.push(e[t++]);n.push(`<p>${g(r.join(" "))}</p>`)}return n.join(`
`)}var m=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let n=e.querySelector("[data-list]");n.innerHTML=this.reviews.length?this.reviews.map((t,o)=>{let r=(t.quotes??[]).filter(i=>!i.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${P(t.creator?.name??"reader")}</span>
              <span class="pen-savestate">${z(t.updated)} \xB7 ${t.status}</span></div>
            <div class="pen-md">${d(t.body||"_(no writing yet)_")}</div>
            ${r.length?`<div class="pen-review-quotes">${r.map((i,a)=>`<a class="pen-qchip" data-ri="${o}" data-qi="${a}">\u201C${P(Q(i.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),n.querySelectorAll(".pen-qchip").forEach(t=>t.addEventListener("click",()=>this.focusQuote(+t.dataset.ri,+t.dataset.qi))),document.body.appendChild(e),this.el=e,document.body.classList.add("pen-panel-open")}focusQuote(e,n){let t=this.reviews[e]?.quotes?.[n];if(!t)return;let o=h(t.selector,this.root);if(!o)return;let r=window.CSS?.highlights;r&&r.set("penumbra-quote-active",new globalThis.Highlight(o));let i=o.getBoundingClientRect();window.scrollTo({top:window.scrollY+i.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),document.body.classList.remove("pen-panel-open"),this.onClose()}};function P(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var z=s=>{try{return new Date(s).toLocaleDateString()}catch{return""}},Q=(s,e=60)=>s.length>e?s.slice(0,e)+"\u2026":s;var M=`
/* ---- theme tokens: light defaults, flipped for dark (OS pref + Quartz toggle) ---- */
:root {
  --pen-bg: #ffffff;
  --pen-fg: #1a1a1a;
  --pen-muted: #6b7280;
  --pen-border: #e4e4e7;
  --pen-shadow: 0 4px 22px rgba(0,0,0,.13);
  --pen-accent: #b9770a;
  --pen-accent-fg: #ffffff;
  --pen-chip: #f3f3f5;
  --pen-chip-hover: #e9e9ec;
  --pen-author: rgba(40,75,99,.12);
  --pen-unread: #e0533b;
}
@media (prefers-color-scheme: dark) {
  :root:not([saved-theme="light"]) {
    --pen-bg: #232328; --pen-fg: #e9e9ec; --pen-muted: #9b9ba4; --pen-border: #3a3a42;
    --pen-shadow: 0 4px 22px rgba(0,0,0,.5); --pen-accent: #e0a52e; --pen-accent-fg: #1a1a1a;
    --pen-chip: #2e2e35; --pen-chip-hover: #3a3a42; --pen-author: rgba(123,151,170,.20); --pen-unread: #ff6f56;
  }
}
:root[saved-theme="dark"] {
  --pen-bg: #232328; --pen-fg: #e9e9ec; --pen-muted: #9b9ba4; --pen-border: #3a3a42;
  --pen-shadow: 0 4px 22px rgba(0,0,0,.5); --pen-accent: #e0a52e; --pen-accent-fg: #1a1a1a;
  --pen-chip: #2e2e35; --pen-chip-hover: #3a3a42; --pen-author: rgba(123,151,170,.20); --pen-unread: #ff6f56;
}

/* translucent highlight reads on both light and dark backgrounds */
::highlight(penumbra) { background-color: rgba(255, 196, 64, 0.32); }
::highlight(penumbra-active) { background-color: rgba(255, 178, 43, 0.58); }
/* pending compose + saved drafts: same yellow, dotted underline until committed */
::highlight(penumbra-draft) { background-color: rgba(255, 196, 64, 0.32); text-decoration: underline dotted; text-decoration-thickness: 2px; }

[data-pen-ui], [data-pen-ui] * { box-sizing: border-box; }
[data-pen-ui] {
  font: 13.5px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  color: var(--pen-fg);
}

/* ---- toolbar ---- */
.pen-toolbar {
  position: fixed; top: 12px; right: 12px; z-index: 2147483646;
  display: flex; gap: 4px; align-items: center;
  background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 10px; padding: 4px; box-shadow: var(--pen-shadow);
}
.pen-tbtn {
  background: none; border: none; color: var(--pen-fg); cursor: pointer;
  border-radius: 7px; padding: 5px 8px; font-size: 13px; display: flex; align-items: center; gap: 5px;
}
.pen-tbtn:hover { background: var(--pen-chip-hover); }
.pen-tbtn.active { background: var(--pen-accent); color: var(--pen-accent-fg); }
.pen-toolbar select {
  background: var(--pen-chip); color: var(--pen-fg); border: 1px solid var(--pen-border);
  border-radius: 7px; padding: 5px 6px; font: inherit; cursor: pointer;
}
.pen-count { color: var(--pen-muted); font-variant-numeric: tabular-nums; min-width: 38px; text-align: center; }
.pen-sep { width: 1px; align-self: stretch; background: var(--pen-border); margin: 2px 2px; }

/* ---- cards (rail + floating) ---- */
.pen-card {
  position: absolute; width: 290px; z-index: 2147483645;
  background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 11px; box-shadow: var(--pen-shadow);
  transition: box-shadow .18s ease; overflow: hidden;
}
.pen-card.compact { cursor: pointer; }
.pen-card.compact:hover { border-color: var(--pen-accent); }
.pen-card.focused { box-shadow: 0 0 0 2px var(--pen-accent), var(--pen-shadow); }
.pen-card.pen-emph { border-color: var(--pen-accent); }
.pen-card.floating { position: absolute; }

.pen-quote {
  font-size: 12px; color: var(--pen-muted); border-left: 3px solid var(--pen-accent);
  padding: 5px 9px; margin: 8px 10px 8px; background: var(--pen-chip);
  border-radius: 0 6px 6px 0; white-space: pre-wrap; word-wrap: break-word;
}
/* clamp only in the compact card; expanded shows everything */
.pen-card.compact .pen-quote { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pen-muted { color: var(--pen-muted); font-style: italic; }
.pen-card .pen-note { min-height: 80px; }
.pen-thread { padding: 2px 12px 10px; }
.pen-comment { padding: 2px 0; }
/* tighten paragraph spacing inside card notes (default <p> margins were huge) */
.pen-card .pen-md p { margin: 0.3em 0; }
.pen-card .pen-md p:first-child { margin-top: 0; }
.pen-card .pen-md p:last-child { margin-bottom: 0; }
.pen-comment + .pen-comment { border-top: 1px solid var(--pen-border); }
.pen-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pen-muted); margin-bottom: 2px; }
.pen-meta img { width: 18px; height: 18px; border-radius: 50%; }
.pen-name { font-weight: 600; color: var(--pen-fg); }
.pen-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  background: var(--pen-author); color: var(--pen-fg); padding: 1px 5px; border-radius: 4px;
}
.pen-body { white-space: pre-wrap; word-wrap: break-word; color: var(--pen-fg); }
.pen-card.compact .pen-body { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pen-unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--pen-unread); flex-shrink: 0; }
.pen-more { font-size: 12px; color: var(--pen-muted); padding-top: 4px; }

.pen-actions { display: flex; gap: 12px; flex-wrap: wrap; padding: 6px 12px 10px; }
.pen-actions a { font-size: 12px; color: var(--pen-accent); cursor: pointer; text-decoration: none; }
.pen-actions a:hover { text-decoration: underline; }
/* bottom-left action group, across from the Reply button */
.pen-foot { display: flex; gap: 14px; align-items: center; }
.pen-foot a { font-size: 12px; color: var(--pen-muted); cursor: pointer; text-decoration: none; }
.pen-foot a:hover { text-decoration: underline; color: var(--pen-accent); }
.pen-foot a[data-act="delete"]:hover { color: var(--pen-unread); }

.pen-reply { padding: 6px 12px 12px; }
.pen-reply textarea, .pen-compose textarea {
  width: 100%; resize: none; overflow-y: hidden; font: inherit; line-height: 1.5;
  background: var(--pen-bg); color: var(--pen-fg);
  border: 1px solid var(--pen-border); border-radius: 7px; padding: 7px;
}
.pen-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; margin-top: 7px; }
.pen-btn {
  background: var(--pen-accent); color: var(--pen-accent-fg); border: none;
  border-radius: 7px; padding: 6px 12px; cursor: pointer; font: inherit; font-weight: 600;
}
.pen-btn:hover { filter: brightness(1.06); }
.pen-btn.ghost { background: var(--pen-chip); color: var(--pen-fg); font-weight: 500; }
.pen-btn.ghost:hover { background: var(--pen-chip-hover); }

/* ---- compose popover (on text selection) ---- */
.pen-compose { position: absolute; width: 360px; max-width: calc(100vw - 24px); z-index: 2147483646;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 11px;
  box-shadow: var(--pen-shadow); padding: 10px; }
.pen-composebar { margin-top: 8px; display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.pen-emojibar { display: flex; gap: 3px; flex-wrap: wrap; min-width: 0; }
.pen-emojibar button { font-size: 16px; background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 8px; padding: 2px 6px; cursor: pointer; line-height: 1.25; }
.pen-emojibar button:hover { background: var(--pen-chip-hover); transform: scale(1.08); }
.pen-composebar .pen-btn { flex-shrink: 0; }

.pen-addbtn {
  position: absolute; z-index: 2147483646; transform: translate(-50%, -118%);
  background: var(--pen-fg); color: var(--pen-bg); border: none; border-radius: 7px;
  padding: 6px 11px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: var(--pen-shadow);
  white-space: nowrap;
}

/* ---- emoji reactions (left rail) ---- */
.pen-emote {
  position: absolute; z-index: 2147483644; cursor: default;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 14px;
  padding: 1px 6px; font-size: 14px; box-shadow: var(--pen-shadow); white-space: nowrap;
}
.pen-emote .pen-emote-count { font-size: 11px; color: var(--pen-muted); margin-left: 2px; }
.pen-emote.pen-emph { border-color: var(--pen-accent); transform: scale(1.18); box-shadow: 0 0 0 2px var(--pen-accent), var(--pen-shadow); }
.pen-tooltip {
  position: absolute; z-index: 2147483647; background: var(--pen-fg); color: var(--pen-bg);
  font-size: 12px; padding: 4px 8px; border-radius: 6px; box-shadow: var(--pen-shadow);
  pointer-events: none; max-width: 220px;
}

/* ---- login widget ---- */
.pen-login {
  position: fixed; right: 12px; bottom: 12px; z-index: 2147483645;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 11px;
  box-shadow: var(--pen-shadow); padding: 10px 12px;
}
.pen-login .pen-title { font-size: 12px; color: var(--pen-muted); }
.pen-login .pen-providers { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
.pen-login input { background: var(--pen-bg); color: var(--pen-fg); border: 1px solid var(--pen-border);
  border-radius: 7px; padding: 6px 8px; font: inherit; width: 150px; }

/* quote highlights driven by the response editor */
::highlight(penumbra-quote) { background-color: rgba(132, 165, 157, 0.34); }
::highlight(penumbra-quote-active) { background-color: rgba(132, 165, 157, 0.72); }

/* when a panel is docked: collapse Quartz's sidebars, constrain the doc to the
   left half with comfortable margins, and let the panel own the right half */
body.pen-panel-open .page { max-width: none !important; margin: 0 !important; }
body.pen-panel-open #quartz-body {
  grid-template: "grid-header" "grid-center" "grid-footer" / auto !important;
  width: 50vw !important; max-width: 50vw !important; margin: 0 !important;
  padding: 2rem 3rem !important; box-sizing: border-box !important;
}
body.pen-panel-open #quartz-body, body.pen-panel-open #quartz-body * { box-sizing: border-box; }
body.pen-panel-open #quartz-body .sidebar { display: none !important; }
body.pen-panel-open .center { max-width: none !important; min-width: 0 !important; overflow-wrap: break-word; }

/* ---- response panel: side-by-side essay editor ---- */
.pen-panel {
  position: fixed; top: 0; right: 0; bottom: 0; width: 50vw; z-index: 2147483646;
  background: var(--pen-bg); border-left: 1px solid var(--pen-border);
  box-shadow: -8px 0 30px rgba(0,0,0,.18); display: flex; flex-direction: column;
}
.pen-panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-savestate { font-size: 12px; color: var(--pen-muted); }
.pen-panel-tools { padding: 8px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-refs { max-height: 32%; overflow: auto; padding: 6px 12px; border-bottom: 1px solid var(--pen-border); }
.pen-refs:empty { display: none; }
.pen-refs-title { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--pen-muted); margin: 2px 0 6px; }
.pen-ref { display: flex; align-items: center; gap: 7px; padding: 4px 0; font-size: 12.5px; cursor: pointer; }
.pen-ref.stale { opacity: .5; }
.pen-ref.stale .pen-ref-text { text-decoration: line-through; }
.pen-ref-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pen-ref-dot.ok { background: var(--pen-tertiary, #84a59d); }
.pen-ref-dot.gone { background: var(--pen-unread); }
.pen-ref-dot.dim { background: var(--pen-muted); }
.pen-ref-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pen-ref-acts { display: flex; gap: 8px; align-items: center; }
.pen-ref-acts em { color: var(--pen-unread); font-style: normal; font-size: 11px; }
.pen-ref-acts a { color: var(--pen-accent); cursor: pointer; }
.pen-editor { flex: 1; overflow: auto; }
.pen-prose { padding: 16px 18px; outline: none; min-height: 100%;
  font: 15px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: var(--pen-fg); }
.pen-prose:focus { outline: none; }
.pen-prose p { margin: .5em 0; }
.pen-prose h1, .pen-prose h2, .pen-prose h3 { line-height: 1.25; margin: .7em 0 .3em; }
.pen-prose ul, .pen-prose ol { padding-left: 1.4em; margin: .5em 0; }
.pen-prose a { color: var(--pen-accent); }
.pen-prose img { max-width: 100%; border-radius: 8px; }
.pen-prose code { background: var(--pen-chip); padding: 1px 5px; border-radius: 4px; font-size: .9em; }
.pen-prose pre { background: var(--pen-chip); padding: 10px 12px; border-radius: 8px; overflow: auto; }
.pen-prose pre code { background: none; padding: 0; }
.pen-prose blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 0 .2em 12px;
  color: var(--pen-muted); background: rgba(132,165,157,.10); border-radius: 0 6px 6px 0; transition: background .15s; }
.pen-prose blockquote p { margin: .15em 0; }
.pen-prose blockquote.pen-bq-active { background: rgba(132,165,157,.30); }
.pen-preview { flex: 1; overflow: auto; padding: 14px 16px; }
.pen-preview h1, .pen-preview h2, .pen-preview h3 { line-height: 1.25; }
.pen-preview blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 0 .2em 12px; color: var(--pen-muted); }
.pen-preview img { max-width: 100%; }
.pen-preview pre { background: var(--pen-chip); padding: 10px; border-radius: 8px; overflow: auto; }

/* ---- author reviews panel ---- */
.pen-reviews { flex: 1; overflow: auto; }
.pen-review { padding: 12px 14px; border-bottom: 1px solid var(--pen-border); }
.pen-review-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.pen-md { font-size: 14px; line-height: 1.55; }
.pen-md h1, .pen-md h2, .pen-md h3 { line-height: 1.25; }
.pen-md blockquote { border-left: 3px solid var(--pen-accent); margin: .5em 0; padding: .1em 0 .1em 10px; color: var(--pen-muted); }
.pen-md img { max-width: 100%; }
.pen-md pre { background: var(--pen-chip); padding: 8px; border-radius: 6px; overflow: auto; }
.pen-review-quotes { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
.pen-qchip { font-size: 12px; color: var(--pen-muted); background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 12px; padding: 2px 8px; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pen-qchip:hover { border-color: var(--pen-accent); color: var(--pen-fg); }
`;async function O(){let s=window;return s.__PenumbraResponsePanel||await new Promise((e,n)=>{let t=document.querySelector('script[src*="penumbra.js"]'),o=t?t.src.replace(/penumbra\.js(\?.*)?$/,"penumbra-editor.js"):"/static/penumbra-editor.js",r=document.createElement("script");r.src=o,r.onload=()=>e(),r.onerror=()=>n(new Error("editor failed to load")),document.head.appendChild(r)}),s.__PenumbraResponsePanel}var F=typeof globalThis.Highlight<"u"&&!!window.CSS?.highlights,y=10,I=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],f=class{constructor(e){this.user=null;this.isAuthor=!1;this.preamble="";this.blocks=[];this.highlightsOn=!0;this.focused=null;this.hovered=null;this.hoverRaf=!1;this.relayoutQueued=!1;this.blockById=e=>this.blocks.find(n=>n.id===e);this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cards=()=>this.blocks.filter(e=>!e.isEmoji&&e.ranges.length);this.chips=()=>this.blocks.filter(e=>e.isEmoji&&e.ranges.length);this.cfg=e,this.api=new u(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.commitSha=e.commitSha??null}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){let e=document.createElement("style");e.textContent=M,document.head.appendChild(e),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let n=await this.api.me();this.user=n.user,this.isAuthor=n.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadDoc(),document.addEventListener("mouseup",t=>{t.target.closest("[data-pen-ui]")||setTimeout(()=>this.onSelection(),0)}),document.addEventListener("mousedown",t=>this.onDocMouseDown(t)),document.addEventListener("click",t=>this.onDocClick(t)),document.addEventListener("mousemove",t=>this.onMouseMove(t),{passive:!0}),document.addEventListener("keydown",t=>{t.key==="Escape"&&(this.compose?this.dismissCompose():this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.removeQuoteBtn(),this.focused=this.hovered=null,this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadDoc()}async loadDoc(){let e="";this.user&&(e=(await this.api.getResponse(this.source).catch(()=>null))?.body??""),this.parse(e),this.renderAll()}parse(e){let{preamble:n,blocks:t}=C(e);this.preamble=n,this.blocks=t.map((o,r)=>({id:`b${r}`,quotes:o.quotes,note:o.note,isEmoji:w(o.note),ranges:o.quotes.map(i=>h([{type:"TextQuoteSelector",exact:i}],this.root)).filter(Boolean)}))}async saveDoc(){let e=q(this.preamble,this.blocks.map(t=>({quotes:t.quotes,note:t.note}))),n=$(e).map((t,o)=>({id:`q${o}`,text:t,selector:L(t,this.root)??[{type:"TextQuoteSelector",exact:t}]}));try{await this.api.saveResponse(this.source,e,n,this.commitSha)}catch(t){alert("Could not save: "+t.message);return}this.focused=null,this.parse(e),this.renderAll()}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!F)return;let e=window.CSS.highlights,n=globalThis.Highlight;if(this.responsePanel)return;if(!this.highlightsOn){e.delete("penumbra-quote"),e.delete("penumbra-quote-active"),e.delete("penumbra-draft");return}let t=this.blocks.flatMap(r=>r.ranges);t.length?e.set("penumbra-quote",new n(...t)):e.delete("penumbra-quote"),this.composeCtx?.range?e.set("penumbra-draft",new n(this.composeCtx.range)):e.delete("penumbra-draft");let o=this.blockById(this.hovered??this.focused)?.ranges[0];o?e.set("penumbra-quote-active",new n(o)):e.delete("penumbra-quote-active")}layoutRightRail(){if(this.layer.querySelectorAll(".pen-card.rail").forEach(p=>p.remove()),!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect();if(window.innerWidth-e.right<300)return;let n=this.cards().sort((p,c)=>this.docY(p.ranges[0])-this.docY(c.ranges[0]));if(!n.length)return;let t=window.scrollX+e.right+24,o=n.map(p=>{let c=this.buildCard(p,this.focused===p.id);return c.style.left=`${t}px`,c.style.top="-9999px",this.layer.appendChild(c),c}),r=o.map(p=>p.offsetHeight),i=n.map(p=>this.docY(p.ranges[0])),a=i.slice(),l=n.findIndex(p=>p.id===this.focused);if(l>=0){a[l]=i[l];for(let p=l+1;p<n.length;p++)a[p]=Math.max(i[p],a[p-1]+r[p-1]+y);for(let p=l-1;p>=0;p--)a[p]=Math.min(i[p],a[p+1]-r[p]-y)}else for(let p=1;p<n.length;p++)a[p]=Math.max(i[p],a[p-1]+r[p-1]+y);o.forEach((p,c)=>p.style.top=`${Math.max(0,a[c])}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote").forEach(o=>o.remove()),!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect(),n=window.scrollX+Math.max(6,e.left-40),t=0;for(let o of this.chips().sort((r,i)=>this.docY(r.ranges[0])-this.docY(i.ranges[0]))){let r=document.createElement("div");r.className="pen-emote",r.setAttribute("data-pen-ui",""),r.dataset.blockId=o.id,r.textContent=o.note.trim(),r.addEventListener("mouseenter",()=>this.setHovered(o.id)),r.addEventListener("mouseleave",()=>this.setHovered(null)),r.addEventListener("click",()=>this.focus(o.id)),this.layer.appendChild(r);let i=Math.max(this.docY(o.ranges[0]),t+6);r.style.left=`${n}px`,r.style.top=`${i}px`,t=i+r.offsetHeight}}buildCard(e,n){let t=document.createElement("div");t.className=`pen-card rail ${n?"focused":"compact"}`,t.setAttribute("data-pen-ui",""),t.dataset.blockId=e.id;let o=e.quotes.map(r=>`<div class="pen-quote">${k(r)}</div>`).join("");if(n){t.innerHTML=`${o}
        <div class="pen-reply"><textarea class="pen-note">${k(e.note)}</textarea>
          <div class="pen-row"><span class="pen-foot"><a data-act="delete">Delete</a></span>
            <button class="pen-btn" data-act="save">Save</button></div></div>`;let r=t.querySelector("textarea");H(r),setTimeout(()=>r.focus(),0);let i=()=>{e.note=r.value,this.saveDoc()};t.querySelector('[data-act="save"]').addEventListener("click",i),r.addEventListener("keydown",a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),i())}),t.querySelector('[data-act="delete"]').addEventListener("click",()=>{confirm("Delete this comment?")&&(this.blocks=this.blocks.filter(a=>a.id!==e.id),this.saveDoc())})}else{let r=e.note.trim()?`<div class="pen-body pen-md">${d(e.note)}</div>`:'<div class="pen-body pen-muted">Add a comment\u2026</div>';t.innerHTML=`${o}<div class="pen-thread">${r}</div>`,t.addEventListener("click",()=>this.focus(e.id))}return t.addEventListener("mouseenter",()=>this.setHovered(e.id)),t.addEventListener("mouseleave",()=>this.setHovered(null)),t}focus(e){this.focused=e,this.renderAll()}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-block-id]").forEach(n=>n.classList.toggle("pen-emph",n.dataset.blockId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||this.responsePanel||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let n=null;for(let t of this.blocks)if(t.ranges.some(o=>this.hitsRange(e,o))){n=t.id;break}this.setHovered(n)}))}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let n=e.getRangeAt(0);if(this.root.contains(n.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(n.cloneRange());return}this.openCompose(n.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let n=e.getBoundingClientRect(),t=document.createElement("button");t.className="pen-addbtn",t.setAttribute("data-pen-ui",""),t.textContent="Quote",t.style.left=`${window.scrollX+n.left+n.width/2}px`,t.style.top=`${window.scrollY+n.top}px`,t.onmousedown=o=>{o.preventDefault(),o.stopPropagation()},t.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(t),this.quoteBtn=t}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}openCompose(e){if(!this.user)return this.promptSignIn(e);let n=T(e,this.root)?.find(a=>a.type==="TextQuoteSelector")?.exact??"";if(!n)return;this.dismissCompose();let t=e.getBoundingClientRect(),o=document.createElement("div");o.className="pen-compose",o.setAttribute("data-pen-ui",""),o.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-372)}px`,o.style.top=`${window.scrollY+t.bottom+8}px`,o.innerHTML=`<textarea placeholder="Comment\u2026  (\u2318/Ctrl + \u23CE to send)"></textarea>
      <div class="pen-composebar">
        <div class="pen-emojibar">${I.map(a=>`<button data-emoji="${a}">${a}</button>`).join("")}</div>
        <button class="pen-btn" data-act="post">Comment</button></div>`;let r=o.querySelector("textarea");H(r);let i=()=>{r.value.trim()&&this.addBlock(n,r.value.trim())};r.addEventListener("keydown",a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),i())}),o.querySelectorAll("[data-emoji]").forEach(a=>a.addEventListener("click",()=>this.addBlock(n,a.dataset.emoji))),o.querySelector('[data-act="post"]').addEventListener("click",i),this.layer.appendChild(o),this.compose=o,this.composeCtx={range:e,quote:n},this.renderHighlights(),r.focus()}promptSignIn(e){this.dismissCompose();let n=e.getBoundingClientRect(),t=document.createElement("div");t.className="pen-compose",t.setAttribute("data-pen-ui",""),t.style.left=`${Math.min(window.scrollX+n.left,window.scrollX+window.innerWidth-372)}px`,t.style.top=`${window.scrollY+n.bottom+8}px`,t.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,t.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.layer.appendChild(t),this.compose=t}addBlock(e,n){this.blocks.push({id:`b${this.blocks.length}`,quotes:[e],note:n,isEmoji:w(n),ranges:[]}),this.dismissCompose(),window.getSelection()?.removeAllRanges(),this.saveDoc()}dismissCompose(){this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,this.renderHighlights()}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.removeQuoteBtn())}onDocClick(e){if(!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let n of this.blocks)if(n.ranges.some(t=>this.hitsRange(e,t)))return this.focus(n.id);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,n){for(let t of n.getClientRects())if(e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom)return!0;return!1}renderToolbar(){let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">\u2726 Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new m({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}async toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();let e;this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active");try{e=await O()}catch{this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),alert("Could not load the editor.");return}this.responsePanel||(this.layer.querySelectorAll(".pen-card.rail, .pen-emote").forEach(n=>n.remove()),this.responsePanel=new e({api:this.api,root:this.root,source:this.source,commitSha:this.commitSha,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.loadDoc()}}),this.responsePanel.open())}showTooltip(e,n){this.hideTooltip();let t=document.createElement("div");t.className="pen-tooltip",t.setAttribute("data-pen-ui",""),t.textContent=n,this.layer.appendChild(t);let o=e.getBoundingClientRect();t.style.left=`${window.scrollX+o.right+8}px`,t.style.top=`${window.scrollY+o.top}px`,this.tooltip=t}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${k(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.loadDoc()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let n=async()=>{let t=e.querySelector("input"),o=t.value.trim();if(!o)return;let r=await this.api.emailLogin(o);r.link?location.href=r.link:(t.value="",t.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",n),e.querySelector("input").addEventListener("keydown",t=>{t.key==="Enter"&&n()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},k=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function H(s,e=7){let n=()=>{s.style.height="auto";let t=getComputedStyle(s),o=parseFloat(t.lineHeight)||20,r=parseFloat(t.paddingTop)+parseFloat(t.paddingBottom)+parseFloat(t.borderTopWidth)+parseFloat(t.borderBottomWidth),i=o*e+r;s.style.height=`${Math.min(s.scrollHeight,i)}px`,s.style.overflowY=s.scrollHeight>i?"auto":"hidden"};s.addEventListener("input",n),requestAnimationFrame(n)}function A(){let s=window.PENUMBRA;if(!s?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new f(s);window.penumbra=e,e.init().catch(n=>console.error("[penumbra] init failed",n)),document.addEventListener("nav",()=>e.reload().catch(n=>console.error("[penumbra] reload failed",n)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",A):A();})();
//# sourceMappingURL=penumbra.js.map
