"use strict";(()=>{var j="penumbra:token",v=class{constructor(e){this.base=e}get token(){return localStorage.getItem(j)}set token(e){e?localStorage.setItem(j,e):localStorage.removeItem(j)}headers(e=!1){let o={};return e&&(o["Content-Type"]="application/json"),this.token&&(o.Authorization=`Bearer ${this.token}`),o}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let o=await e.json();return{user:o.user,isAuthor:!!o.isAuthor}}async list(e,o=[]){let t=new URLSearchParams({source:e});o.length&&t.set("include",o.join(","));let n=await fetch(`${this.base}/annotations?${t}`);return n.ok?(await n.json()).items:[]}async create(e,o,t={}){let n=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:t.kind??"comment",body:[{type:"TextualBody",value:o}],docVersion:t.docVersion})});if(!n.ok)throw new Error((await n.json().catch(()=>({}))).error??`create failed (${n.status})`);return n.json()}async reply(e,o){let t=e.split("/annotations/")[1],n=await fetch(`${this.base}/annotations/${t}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:o})});if(!n.ok)throw new Error((await n.json().catch(()=>({}))).error??`reply failed (${n.status})`);return n.json()}async patch(e,o){let t=e.split("/annotations/")[1],n=await fetch(`${this.base}/annotations/${t}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(o)});if(!n.ok)throw new Error(`patch failed (${n.status})`);return n.json()}async remove(e){let o=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${o}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let o=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return o.ok?(await o.json()).response:null}async saveResponse(e,o,t,n){let i=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:o,quotes:t,sourceSha:n})});if(!i.ok)throw new Error((await i.json().catch(()=>({}))).error??`save failed (${i.status})`);return i.json()}async getAllResponses(e){let o=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return o.ok?(await o.json()).responses:[]}async submitResponse(e){let o=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),t=await o.json().catch(()=>({}));if(!o.ok)throw new Error(t.error??`submit failed (${o.status})`);return t}async uploadImage(e){let o={"Content-Type":e.type||"application/octet-stream"};this.token&&(o.Authorization=`Bearer ${this.token}`);let t=await fetch(`${this.base}/upload`,{method:"POST",headers:o,body:e});if(!t.ok)throw new Error(`upload failed (${t.status})`);return(await t.json()).url}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function x(s){let e=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode(i){let a=i.parentElement;return a&&a.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),o=[],t="",n;for(;n=e.nextNode();){let i=n,a=t.length;t+=i.data,o.push({node:i,start:a,end:t.length})}return{text:t,nodes:o}}function w(s,e){for(let t of s.nodes)if(e>=t.start&&e<=t.end)return{node:t.node,offset:e-t.start};let o=s.nodes[s.nodes.length-1];return o?{node:o.node,offset:o.node.data.length}:null}function y(s,e,o){if(e.nodeType===Node.TEXT_NODE){let i=s.nodes.find(a=>a.node===e);return i?i.start+o:null}let t=e.childNodes[o]??e.childNodes[e.childNodes.length-1];if(!t)return null;let n=s.nodes.find(i=>i.node===t||t.contains(i.node));return n?n.start:null}function H(s,e){let o=x(e),t=y(o,s.startContainer,s.startOffset),n=y(o,s.endContainer,s.endOffset);if(t==null||n==null||n<=t)return null;let i=o.text.slice(t,n),a=o.text.slice(Math.max(0,t-32),t),r=o.text.slice(n,n+32);return[{type:"TextQuoteSelector",exact:i,prefix:a,suffix:r},{type:"TextPositionSelector",start:t,end:n}]}function A(s,e){let o=s.find(p=>p.type==="TextQuoteSelector");if(!o?.exact)return null;let t=x(e),n=J(t.text,o);if(n<0)return null;let i=w(t,n),a=w(t,n+o.exact.length);if(!i||!a)return null;let r=document.createRange();return r.setStart(i.node,i.offset),r.setEnd(a.node,a.offset),r}function N(s,e){let o=[],t=s.indexOf(e);for(;t>=0;)o.push(t),t=s.indexOf(e,t+1);return o}function z(s,e){let o=x(e),t=y(o,s.startContainer,s.startOffset),n=y(o,s.endContainer,s.endOffset);if(t==null||n==null||n<=t)return 1;let i=o.text.slice(t,n),a=N(o.text,i).indexOf(t);return a>=0?a+1:1}function B(s,e,o){if(!s)return null;let t=x(o),n=N(t.text,s);if(!n.length)return null;let i=n[Math.min(Math.max(1,e||1),n.length)-1],a=w(t,i),r=w(t,i+s.length);if(!a||!r)return null;let p=document.createRange();return p.setStart(a.node,a.offset),p.setEnd(r.node,r.offset),p}function C(s,e){let o=s.trim();if(o.length<8)return null;let t=x(e),n=t.text.indexOf(o);return n<0?null:[{type:"TextQuoteSelector",exact:o,prefix:t.text.slice(Math.max(0,n-32),n),suffix:t.text.slice(n+o.length,n+o.length+32)},{type:"TextPositionSelector",start:n,end:n+o.length}]}function J(s,e){let o=[],t=s.indexOf(e.exact);for(;t>=0;)o.push(t),t=s.indexOf(e.exact,t+1);if(o.length===0)return-1;if(o.length===1)return o[0];let n=o[0],i=-1;for(let a of o){let r=0;if(e.prefix){let p=s.slice(Math.max(0,a-e.prefix.length),a);r+=W(p,e.prefix)}if(e.suffix){let p=s.slice(a+e.exact.length,a+e.exact.length+e.suffix.length);r+=V(p,e.suffix)}r>i&&(i=r,n=a)}return n}var V=(s,e)=>{let o=0;for(;o<s.length&&o<e.length&&s[o]===e[o];)o++;return o},W=(s,e)=>{let o=0;for(;o<s.length&&o<e.length&&s[s.length-1-o]===e[e.length-1-o];)o++;return o};var O=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function Q(s){let e=/^\s*>(\d+)\s(.*)$/.exec(s);return e?{nth:Number(e[1]),text:e[2]}:{nth:1,text:(s??"").replace(/^\s*>\s?/,"")}}function K(s,e){return s>1?`>${s} ${e}`:`> ${e}`}function G(s){let e=[],o=[],t=1,n=()=>{let i=o.join(" ").trim();i.length>=6&&e.push({text:i,nth:t}),o=[],t=1};for(let i of(s??"").split(`
`))if(/^\s*>/.test(i))if(o.length)o.push(i.replace(/^\s*>\s?/,""));else{let a=Q(i);t=a.nth,o.push(a.text)}else o.length&&n();return o.length&&n(),e}function M(s){return G(s).map(e=>e.text)}var L=s=>/^\s*>/.test(s??"");function I(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),o=0,t=[];for(;o<e.length&&!L(e[o]);)t.push(e[o]),o++;let n=[];for(;o<e.length;){let i=[],a=1;for(;o<e.length&&L(e[o]);){if(i.length)i.push(e[o].replace(/^\s*>\s?/,""));else{let p=Q(e[o]);a=p.nth,i.push(p.text)}o++}let r=[];for(;o<e.length&&!L(e[o]);)r.push(e[o]),o++;for(;r.length&&r[0].trim()==="";)r.shift();for(;r.length&&r[r.length-1].replace(/​/g,"").trim()==="";)r.pop();n.push({quotes:[i.join(" ").trim()],nths:[a],note:r.join(`
`)})}return{preamble:t.join(`
`).trim(),blocks:n}}function R(s,e){let o=[];for(let a of e){let r=a.note.replace(/^\n+/,"").replace(/[\s​]+$/,"");if(!a.quotes.join("").trim()&&!r.trim())continue;let p=a.quotes.map((h,c)=>K(a.nths?.[c]??1,h.replace(/\n/g," "))).join(`
>
`);o.push(r?`${p}

${r}`:p)}let t=o.join(`


`),n=s.trim();return(n&&t?`${n}

${t}`:n||t)+`
`}function F(s){let e=s??"",o=[],t=0,n=Intl.Segmenter;if(typeof n=="function")for(let{segment:i}of new n("en",{granularity:"grapheme"}).segment(e)){if(/^\s+$/.test(i)){t+=i.length;continue}if(/\p{Extended_Pictographic}/u.test(i)){o.push(i),t+=i.length;continue}break}else{let i=/^((?:\p{Extended_Pictographic}(?:[️‍\u{1F3FB}-\u{1F3FF}]|\p{Extended_Pictographic})*|\s)+)/u.exec(e);if(i){t=i[0].length;for(let a of[...i[0]])/\p{Extended_Pictographic}/u.test(a)&&o.push(a)}}return{emojis:o,text:e.slice(t)}}function u(s){let e=(s??"").replace(/​/g,""),o=Intl.Segmenter;if(typeof o=="function"){for(let{segment:t}of new o("en",{granularity:"grapheme"}).segment(e))if(!/^\s+$/.test(t)&&!/\p{Extended_Pictographic}/u.test(t))return!0;return!1}return/\S/.test(e.replace(/\p{Extended_Pictographic}/gu,""))}function k(s){return O(s).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function g(s){let e=(s??"").replace(/\r\n/g,`
`).split(`
`),o=[],t=0;for(;t<e.length;){let n=e[t];if(/^```/.test(n)){let r=[];for(t++;t<e.length&&!/^```/.test(e[t]);)r.push(e[t++]);t++,o.push(`<pre><code>${O(r.join(`
`))}</code></pre>`);continue}if(/^[\s​]*$/.test(n)){t++;continue}if(/^#{1,6}\s/.test(n)){let r=/^(#{1,6})\s+(.*)$/.exec(n);o.push(`<h${r[1].length}>${k(r[2])}</h${r[1].length}>`),t++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(n)){o.push("<hr>"),t++;continue}if(/^\s*>/.test(n)){let r=[];for(;t<e.length&&/^\s*>/.test(e[t]);)r.push(e[t++].replace(/^\s*>\s?/,""));o.push(`<blockquote>${g(r.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(n)){let r=[];for(;t<e.length&&/^\s*[-*+]\s/.test(e[t]);)r.push(`<li>${k(e[t++].replace(/^\s*[-*+]\s+/,""))}</li>`);o.push(`<ul>${r.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(n)){let r=[];for(;t<e.length&&/^\s*\d+\.\s/.test(e[t]);)r.push(`<li>${k(e[t++].replace(/^\s*\d+\.\s+/,""))}</li>`);o.push(`<ol>${r.join("")}</ol>`);continue}let i=[];for(;t<e.length&&!/^[\s​]*$/.test(e[t])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[t]);)i.push(e[t++]);let a=k(i.join(" "));o.push(/^<img\b[^>]*>$/.test(a)?a:`<p>${a}</p>`)}return o.join(`
`)}var E=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let o=e.querySelector("[data-list]");o.innerHTML=this.reviews.length?this.reviews.map((t,n)=>{let i=(t.quotes??[]).filter(a=>!a.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${_(t.creator?.name??"reader")}</span>
              <span class="pen-savestate">${Z(t.updated)} \xB7 ${t.status}</span></div>
            <div class="pen-md">${g(t.body||"_(no writing yet)_")}</div>
            ${i.length?`<div class="pen-review-quotes">${i.map((a,r)=>`<a class="pen-qchip" data-ri="${n}" data-qi="${r}">\u201C${_(ee(a.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),o.querySelectorAll(".pen-qchip").forEach(t=>t.addEventListener("click",()=>this.focusQuote(+t.dataset.ri,+t.dataset.qi))),document.body.appendChild(e),this.el=e,document.body.classList.add("pen-panel-open")}focusQuote(e,o){let t=this.reviews[e]?.quotes?.[o];if(!t)return;let n=A(t.selector,this.root);if(!n)return;let i=window.CSS?.highlights;i&&i.set("penumbra-quote-active",new globalThis.Highlight(n));let a=n.getBoundingClientRect();window.scrollTo({top:window.scrollY+a.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),document.body.classList.remove("pen-panel-open"),this.onClose()}};function _(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var Z=s=>{try{return new Date(s).toLocaleDateString()}catch{return""}},ee=(s,e=60)=>s.length>e?s.slice(0,e)+"\u2026":s;var D=`
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
  transition: box-shadow .18s ease; overflow: visible; /* let reactions hang off the edge */
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
/* images in a margin card are small fixed-height previews (full size lives in the
   editor); the fixed height also keeps card measurement stable so they don't overlap */
.pen-card .pen-md img { display: block; height: 56px; width: auto; max-width: 100%; border-radius: 6px; margin: 0; }
.pen-thread { padding: 2px 12px 10px; }
.pen-comment { padding: 2px 0; }
/* tighten paragraph spacing inside card notes (default <p> margins were huge) */
.pen-card .pen-md p { margin: 0.15em 0; }
.pen-card .pen-md p:first-child { margin-top: 0; }
.pen-card .pen-md p:last-child { margin-bottom: 0; }
.pen-card .pen-md > :first-child { margin-top: 0; }
.pen-card .pen-md > :last-child { margin-bottom: 0; }
.pen-comment + .pen-comment { border-top: 1px solid var(--pen-border); }
.pen-meta { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--pen-muted); margin-bottom: 2px; }
.pen-meta img { width: 18px; height: 18px; border-radius: 50%; }
.pen-name { font-weight: 600; color: var(--pen-fg); }
.pen-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;
  background: var(--pen-author); color: var(--pen-fg); padding: 1px 5px; border-radius: 4px;
}
.pen-body { white-space: pre-wrap; word-wrap: break-word; color: var(--pen-fg); }
.pen-card.compact .pen-md { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
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
.pen-compose .pen-note-editor { border: 1px solid var(--pen-border); border-radius: 8px;
  max-height: 40vh; overflow-y: auto; margin-bottom: 8px; }
.pen-compose .pen-prose.pen-mini { min-height: 2.2em; }
.pen-compose .pen-prose.pen-mini > :last-child { margin-bottom: 0; }
.pen-composebar { margin-top: 8px; display: flex; gap: 8px; align-items: center; justify-content: space-between; }
.pen-emojibar { display: flex; flex-wrap: nowrap; gap: 3px; align-items: center; overflow: hidden; }
.pen-emojibar button { font-size: 16px; background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 8px; padding: 2px 6px; cursor: pointer; line-height: 1.25; }
.pen-emojibar button:hover { background: var(--pen-chip-hover); transform: scale(1.08); }
/* selected = filled (amber tint: darker on light, lighter on dark) + thin border */
.pen-emojibar button.selected, .pen-emojigrid button.selected {
  background: rgba(185,119,10,.22); border-color: var(--pen-accent); box-shadow: none; }
.pen-composebar .pen-btn { flex-shrink: 0; }

.pen-addbtn {
  position: absolute; z-index: 2147483646; transform: translate(-50%, -118%);
  background: var(--pen-fg); color: var(--pen-bg); border: none; border-radius: 7px;
  padding: 6px 11px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: var(--pen-shadow);
  white-space: nowrap;
}

/* ---- emoji reactions (left margin): a horizontal cluster that spreads LEFT ---- */
/* translateX(-100%) pins the right edge at the JS-set left coord, so the cluster
   grows leftward and the rightmost (= first) emoji stays put. */
.pen-emote-stack {
  position: absolute; z-index: 2147483644; cursor: pointer;
  display: flex; flex-direction: row; align-items: center; transform: translateX(-100%);
}
.pen-emote {
  font-size: 16px; line-height: 1; white-space: nowrap; margin-left: -9px;
  filter: drop-shadow(0 1px 1px rgba(0,0,0,.18));
  transition: margin-left .12s ease;
}
.pen-emote:first-child { margin-left: 0; }
/* hover (or emphasised): the overlapping glyphs fan out side-by-side. The right
   edge is pinned, so they spread leftward; a single emoji has nothing to spread. */
.pen-emote-stack:hover .pen-emote, .pen-emote-stack.pen-emph .pen-emote { margin-left: 3px; }
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
/* amber/yellow to match a "found" quote's colour in the editor */
::highlight(penumbra-quote) { background-color: rgba(255, 196, 64, 0.34); }
::highlight(penumbra-quote-active) { background-color: rgba(255, 178, 43, 0.62); }

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
/* editor images: natural size, capped to the editor width and 25vh tall */
.pen-prose img { display: block; width: auto; height: auto; max-width: 100%; max-height: 25vh; border-radius: 8px; margin: 8px 0; }
.pen-prose code { background: var(--pen-chip); padding: 1px 5px; border-radius: 4px; font-size: .9em; }
.pen-prose pre { background: var(--pen-chip); padding: 10px 12px; border-radius: 8px; overflow: auto; }
.pen-prose pre code { background: none; padding: 0; }
/* a quote FOUND in the source = burnt amber; NOT found = cool teal (won't anchor) */
.pen-prose blockquote { border-left: 3px solid var(--pen-accent); margin: .6em 0; padding: .2em 0 .2em 12px;
  color: var(--pen-muted); background: rgba(185,119,10,.09); border-radius: 0 5px 5px 0;
  transition: background .12s ease, box-shadow .12s ease, border-color .12s ease; }
.pen-prose blockquote p { margin: .15em 0; }
.pen-prose blockquote.pen-bq-active { background: rgba(185,119,10,.20);
  box-shadow: inset 4px 0 0 var(--pen-accent), 0 0 0 2px rgba(185,119,10,.42); }
/* quote that won't anchor (text not in source, OR too short) \u2192 cool teal, no picker */
.pen-prose blockquote.pen-bq-orphan { border-left-color: #4f8f80; background: rgba(79,143,128,.13); }
.pen-prose blockquote.pen-bq-orphan.pen-bq-active { background: rgba(79,143,128,.28);
  box-shadow: inset 4px 0 0 #4f8f80, 0 0 0 2px rgba(79,143,128,.42); }
/* gapcursor: a visible blinking caret in the gap before/after a block image */
.ProseMirror-gapcursor { display: none; pointer-events: none; position: absolute; margin: 0; }
.ProseMirror-gapcursor::after { content: ""; display: block; position: absolute; top: -2px; width: 18px;
  border-top: 2px solid var(--pen-fg); animation: pen-gapcursor 1.1s steps(2, start) infinite; }
@keyframes pen-gapcursor { to { visibility: hidden; } }
.ProseMirror-focused .ProseMirror-gapcursor { display: block; }
/* occurrence picker: tiny "N of M \u2039 \u203A" badge above a quote whose text repeats */
.pen-occ { display: inline-flex; align-items: center; vertical-align: middle; gap: 1px;
  font-size: 10px; line-height: 1; color: var(--pen-muted); user-select: none; margin: 1px 0 4px;
  background: var(--pen-chip); border: 1px solid var(--pen-border); border-radius: 7px; padding: 1px 3px; }
.pen-occ-a { border: none; background: none; cursor: pointer; color: var(--pen-muted);
  font: inherit; font-size: 13px; line-height: 1; padding: 0 3px; }
.pen-occ-a:hover { color: var(--pen-accent); }
.pen-occ-n { font-variant-numeric: tabular-nums; padding: 0 2px; white-space: nowrap; }

/* rich editor inside a margin card: borderless, compact, aligned with the quote.
   font-size matches .pen-md so rendered vs editing text are the same size. */
/* match the compact .pen-thread/.pen-md geometry (12px inset) so text doesn't shift on focus */
.pen-prose.pen-mini { padding: 2px 12px; font-size: 14px; line-height: 1.55; min-height: 1.4em; }
.pen-prose.pen-mini p { margin: 0.15em 0; }
.pen-prose.pen-mini img { margin: 4px 0; }
/* the save state floats in the card's bottom-right corner (out of flow, dimmed) so
   "saving\u2026"/"saved" never changes the card's height. */
.pen-card.focused { padding-bottom: 6px; }
.pen-card .pen-savestate { position: absolute; right: 11px; bottom: 1px; pointer-events: none;
  font-size: 11px; color: var(--pen-fg); opacity: .35; }
.pen-card.focused .pen-note-editor .pen-prose.pen-mini > :first-child { margin-top: 0; }
.pen-card.focused .pen-note-editor .pen-prose.pen-mini > :last-child { margin-bottom: 0; }
/* tiny reactions hanging off the bottom edge of a (compact) comment card */
.pen-card-emoji { position: absolute; left: 12px; bottom: -8px; display: flex; gap: 3px;
  font-size: 13px; line-height: 1; filter: drop-shadow(0 1px 1px rgba(0,0,0,.2)); }
/* the reaction picker floats just below the focused card (outside it) */
.pen-cardemoji { position: absolute; z-index: 2147483645; }
.pen-cardemoji .pen-emojibar { gap: 5px; overflow: visible; } /* don't clip button shadows */
.pen-cardemoji .pen-emojimore { background: var(--pen-bg); border: 1px solid var(--pen-border);
  border-radius: 11px; box-shadow: var(--pen-shadow); padding: 8px; margin-top: 6px; max-width: 290px; }
.pen-cardemoji .pen-emojibar button { font-size: 17px; padding: 5px 7px; line-height: 1;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 9px; box-shadow: var(--pen-shadow); }
.pen-cardemoji .pen-emojibar button:hover { background: var(--pen-chip-hover); transform: none; }
.pen-cardemoji .pen-emojibar button.selected { background: rgba(185,119,10,.22);
  border-color: var(--pen-accent); box-shadow: var(--pen-shadow); }

/* trash sits OUTSIDE the focused card (left gutter); click reveals stacked \u2713/\u2717 */
.pen-card.focused { overflow: visible; }
.pen-card .pen-trashbox { display: none; position: absolute; left: -34px; top: 2px; flex-direction: column; gap: 4px; }
.pen-card.focused .pen-trashbox { display: flex; }
.pen-trash { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-size: 13px;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 50%; color: var(--pen-muted);
  cursor: pointer; box-shadow: var(--pen-shadow); }
.pen-trash:hover, .pen-trash.pen-no:hover { color: var(--pen-unread); border-color: var(--pen-unread); }
.pen-trash.pen-yes:hover { color: var(--pen-tertiary, #84a59d); border-color: var(--pen-tertiary, #84a59d); }
.pen-trashconfirm { display: flex; flex-direction: column; gap: 4px; }
.pen-trashconfirm[hidden] { display: none; }

/* emoji picker (in the compose box) */
.pen-emoji-more { font-weight: 700; }
.pen-emojimore { margin-top: 6px; }
.pen-emoji-search { width: 100%; box-sizing: border-box; background: var(--pen-bg); color: var(--pen-fg);
  border: 1px solid var(--pen-border); border-radius: 7px; padding: 5px 8px; font: inherit; margin-bottom: 6px; }
.pen-emojigrid { display: flex; flex-wrap: wrap; gap: 2px; max-height: 160px; overflow-y: auto; }
.pen-emojigrid button { font-size: 18px; background: none; border: none; cursor: pointer; border-radius: 6px; padding: 2px 4px; }
.pen-emojigrid button:hover { background: var(--pen-chip-hover); }
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

/* ---- mobile: dock comments + compose as a bottom sheet ---- */
/* The sheet is fixed to the bottom (JS lifts it above the keyboard via
   visualViewport). A scrollable body holds the comment/compose; the reaction
   picker sits in a pinned footer. */
.pen-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483646;
  display: flex; flex-direction: column; max-height: 50vh;
  background: var(--pen-bg); border-top: 1px solid var(--pen-border);
  border-radius: 16px 16px 0 0; box-shadow: 0 -6px 30px rgba(0,0,0,.32);
}
.pen-sheet-head { position: relative; flex: 0 0 auto; height: 26px; }
.pen-sheet-grab { width: 40px; height: 4px; border-radius: 3px; background: var(--pen-border); margin: 9px auto 0; }
.pen-sheet-close {
  position: absolute; top: 2px; right: 8px; width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; font-size: 15px; line-height: 1;
  background: var(--pen-chip); border: 1px solid var(--pen-border); color: var(--pen-fg); cursor: pointer;
}
.pen-sheet-body { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 6px 6px; }
.pen-sheet-foot {
  flex: 0 0 auto; border-top: 1px solid var(--pen-border);
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
}
/* the card/compose flow inside the sheet body (drop the floating geometry) */
.pen-sheet .pen-card, .pen-sheet .pen-compose {
  position: static; width: 100%; max-width: 100%; border: none; box-shadow: none;
  border-radius: 0; padding: 0;
}
.pen-sheet .pen-card.focused { box-shadow: none; padding-bottom: 0; }
.pen-sheet .pen-compose .pen-note-editor { max-height: none; margin-bottom: 0; }
/* bigger comment images on mobile (the desktop 56px preview is too small to read) */
.pen-sheet .pen-card .pen-md img { height: auto; max-height: 38vh; }
/* save state back in flow (not floating over the text) */
.pen-sheet .pen-card .pen-savestate { position: static; display: block; text-align: right; padding: 2px 12px 0; opacity: .5; }
/* trash row in flow at the comment's bottom-right (the desktop -34px gutter is off-screen) */
.pen-sheet .pen-card .pen-trashbox {
  position: static; left: auto; top: auto; display: flex; flex-direction: row;
  justify-content: flex-end; gap: 6px; padding: 4px 12px 2px;
}
/* roomier tap targets for the reaction picker in the footer */
.pen-sheet-foot .pen-emojipanel .pen-emojibar { flex-wrap: wrap; gap: 6px; overflow: visible; }
.pen-sheet-foot .pen-emojibar button { font-size: 21px; padding: 6px 10px; }
.pen-sheet-foot .pen-emojigrid button { font-size: 23px; padding: 5px 6px; }
.pen-sheet-foot .pen-emojigrid { max-height: 26vh; }

/* the response / reviews panel goes full-screen on a phone (no room for the
   side-by-side source view); JS keeps its height pinned to the visual viewport
   so the editor stays above the on-screen keyboard. */
@media (max-width: 720px) {
  .pen-panel { width: 100vw; max-width: 100vw; border-left: none; }
  body.pen-panel-open #quartz-body {
    width: 100% !important; max-width: 100% !important; padding: 1rem !important;
  }
  .pen-panel .pen-prose { padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px)); }
}
/* the "\u275D Quote" harvest button only makes sense on mobile (desktop selects in the
   left half directly); peek = collapse the editor to a bottom bar to free the page */
.pen-quotebtn { display: none; }
@media (max-width: 720px) { .pen-quotebtn { display: flex; } }
.pen-peekbar {
  display: flex; align-items: center; gap: 10px; justify-content: space-between;
  padding: 9px 14px calc(9px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--pen-border); font-size: 13px; color: var(--pen-muted);
}
.pen-peekbar[hidden] { display: none; }
.pen-peekbar .pen-btn { flex-shrink: 0; padding: 5px 14px; }
.pen-panel.pen-peek {
  top: auto; bottom: 0; height: auto; max-height: none;
  border-radius: 14px 14px 0 0; border-top: 1px solid var(--pen-border);
  box-shadow: 0 -6px 30px rgba(0,0,0,.32);
}
.pen-panel.pen-peek .pen-editor { display: none; }
`;var S=null;function X(){return window.__PenumbraResponsePanel?Promise.resolve():S||(S=new Promise((s,e)=>{let o=document.querySelector('script[src*="penumbra.js"]'),t=o?o.src.replace(/penumbra\.js(\?.*)?$/,"penumbra-editor.js"):"/static/penumbra-editor.js";(location.hostname==="localhost"||location.hostname==="127.0.0.1")&&(t+=`?t=${Date.now()}`);let n=document.createElement("script");n.src=t,n.onload=()=>s(),n.onerror=()=>e(new Error("editor failed to load")),document.head.appendChild(n)}),S)}async function te(){return await X(),window.__PenumbraResponsePanel}async function U(){return await X(),window.__PenumbraMiniEditor}var oe=typeof globalThis.Highlight<"u"&&!!window.CSS?.highlights,q=10,$=6,ne=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],ie=[["\u{1F44D}","thumbs up like yes good approve"],["\u{1F44E}","thumbs down dislike no bad"],["\u2764\uFE0F","heart love red"],["\u{1F525}","fire lit hot flame"],["\u{1F4AF}","hundred 100 perfect score"],["\u{1F389}","party tada celebrate congrats"],["\u{1F680}","rocket launch fast ship"],["\u{1F4A1}","idea bulb light"],["\u2705","check done yes correct"],["\u274C","cross no wrong x"],["\u2B50","star favorite"],["\u{1F64F}","pray thanks please hands"],["\u{1F44F}","clap applause bravo"],["\u{1F440}","eyes look watching"],["\u{1F914}","think thinking hmm"],["\u{1F602}","laugh lol joy cry"],["\u{1F60D}","love eyes heart"],["\u{1F62E}","wow surprised"],["\u{1F622}","sad cry tear"],["\u{1F621}","angry mad rage"],["\u{1F605}","sweat nervous laugh"],["\u{1F60E}","cool sunglasses"],["\u{1F92F}","mind blown exploding head"],["\u{1F64C}","raised hands celebrate yay"],["\u{1F4AA}","muscle strong flex"],["\u{1F91D}","handshake deal agree"],["\u{1F9E0}","brain smart mind"],["\u{1F4CC}","pin important"],["\u26A1","lightning fast bolt energy"],["\u{1F31F}","glowing star"],["\u2728","sparkles shiny magic"],["\u{1F480}","skull dead lol"],["\u{1F979}","holding back tears touched"],["\u{1FAE1}","salute respect"],["\u{1F937}","shrug dunno whatever"],["\u{1FAE0}","melting embarrassed"],["\u{1F4DD}","memo note write"],["\u{1F516}","bookmark save tag"],["\u2753","question"],["\u2757","exclamation important"],["\u{1F600}","grin happy smile"],["\u{1F642}","slight smile"],["\u{1F609}","wink"],["\u{1F928}","raised eyebrow suspicious doubt"],["\u{1F644}","eye roll annoyed"],["\u{1F634}","sleep tired bored"],["\u{1F973}","party face celebrate"],["\u{1F631}","scream shock fear"],["\u{1F913}","nerd glasses geek"],["\u{1FAF6}","heart hands love"],["\u{1F44C}","ok perfect nice"],["\u{1F90C}","chefs kiss pinch"],["\u270C\uFE0F","peace victory"],["\u{1F91E}","fingers crossed luck hope"],["\u{1F44B}","wave hi hello bye"],["\u{1F3AF}","target bullseye goal"],["\u{1F410}","goat greatest"],["\u{1F4B8}","money cash spend"],["\u{1F4C8}","chart up growth"],["\u{1F4C9}","chart down decline"]],re='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',T=class{constructor(e){this.user=null;this.isAuthor=!1;this.preamble="";this.blocks=[];this.highlightsOn=!0;this.focused=null;this.hovered=null;this.hoverRaf=!1;this.relayoutQueued=!1;this.railEntries=[];this.repoQueued=!1;this.railLeft=0;this.quietTimer=null;this.composeNew=!1;this.selTimer=null;this.isMobile=()=>window.innerWidth<=720;this.blockById=e=>this.blocks.find(o=>o.id===e);this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cards=()=>this.blocks.filter(e=>u(e.text)&&e.ranges.length);this.emojiBlocks=()=>this.blocks.filter(e=>e.emojis.length&&e.ranges.length);this.cfg=e,this.api=new v(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.commitSha=e.commitSha??null}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){this.styleEl=document.createElement("style"),this.styleEl.setAttribute("data-pen",""),this.styleEl.textContent=D,document.head.appendChild(this.styleEl),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let e=await this.api.me();this.user=e.user,this.isAuthor=e.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadDoc(),document.addEventListener("mouseup",t=>{t.target.closest("[data-pen-ui]")||this.scheduleSelection()}),document.addEventListener("touchend",t=>{t.target.closest("[data-pen-ui]")||this.scheduleSelection()},{passive:!0}),document.addEventListener("mousedown",t=>this.onDocMouseDown(t)),document.addEventListener("click",t=>this.onDocClick(t)),document.addEventListener("mousemove",t=>this.onMouseMove(t),{passive:!0}),document.addEventListener("keydown",t=>{t.key==="Escape"&&(this.compose?this.dismissCompose():this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0});let o=window.visualViewport;if(o){let t=()=>this.repositionSheets();o.addEventListener("resize",t),o.addEventListener("scroll",t)}}async reload(){this.dismissCompose(),this.removeQuoteBtn(),this.focused=this.hovered=null,this.styleEl.isConnected||document.head.appendChild(this.styleEl),this.layer.isConnected||document.body.appendChild(this.layer),this.toolbar?.isConnected||this.renderToolbar(),this.loginEl?.isConnected||this.renderLogin(),this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadDoc()}async loadDoc(){let e="";this.user&&(e=(await this.api.getResponse(this.source).catch(()=>null))?.body??""),this.parse(e),this.renderAll()}parse(e){let{preamble:o,blocks:t}=I(e);this.preamble=o,this.blocks=t.map((n,i)=>{let{emojis:a,text:r}=F(n.note);return{id:`b${i}`,quotes:n.quotes,nths:n.nths,note:n.note,emojis:a,text:r,ranges:n.quotes.map((p,h)=>B(p,n.nths[h]??1,this.root)).filter(Boolean)}})}async saveDoc(){let e=R(this.preamble,this.blocks.map(t=>({quotes:t.quotes,nths:t.nths,note:t.note}))),o=M(e).map((t,n)=>({id:`q${n}`,text:t,selector:C(t,this.root)??[{type:"TextQuoteSelector",exact:t}]}));try{await this.api.saveResponse(this.source,e,o,this.commitSha)}catch(t){alert("Could not save: "+t.message);return}this.focused=null,this.parse(e),this.renderAll()}async serializeAndSave(){let e=R(this.preamble,this.blocks.map(t=>({quotes:t.quotes,nths:t.nths,note:t.note}))),o=M(e).map((t,n)=>({id:`q${n}`,text:t,selector:C(t,this.root)??[{type:"TextQuoteSelector",exact:t}]}));try{return await this.api.saveResponse(this.source,e,o,this.commitSha),!0}catch{return!1}}saveQuiet(e){let o=t=>{let n=e?.querySelector("[data-cardsave]");n&&(n.textContent=t)};o("saving\u2026"),clearTimeout(this.quietTimer),this.quietTimer=setTimeout(async()=>o(await this.serializeAndSave()?"saved":"save failed"),600)}flushQuiet(){clearTimeout(this.quietTimer),this.serializeAndSave()}composeNote(e,o){let t=e.join(""),n=o.replace(/^\s+/,"");return n.trim()?t?`${t} ${n}`:n:t}renderAll(){if(this.renderHighlights(),this.isMobile()){this.layoutMobileSheet();return}this.layoutRightRail(),this.layoutLeftRail()}scheduleSelection(){clearTimeout(this.selTimer),this.selTimer=setTimeout(()=>this.onSelection(),30)}layoutMobileSheet(){if(this.railRO?.disconnect(),this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-cardemoji, .pen-emote-stack, .pen-sheet").forEach(i=>i.remove()),this.cardEmojiRow=void 0,this.railEntries=[],!this.highlightsOn||this.responsePanel)return;let e=this.blockById(this.focused);if(!e||!e.ranges.length||!u(e.text))return;let o=this.buildCard(e,!0),t=document.createElement("div");t.className="pen-sheet-foot",t.setAttribute("data-pen-ui",""),t.appendChild(this.buildEmojiPanel(()=>e.emojis,i=>this.toggleCardEmoji(e,i,o)));let n=this.wrapSheet(o,{onClose:()=>{this.focused=null,this.renderAll()},footer:t});this.layer.appendChild(n),this.railEntries=[{el:o,blk:e}],this.positionSheet(n),this.mountCardEditor(o,e)}wrapSheet(e,o){let t=document.createElement("div");t.className="pen-sheet",t.setAttribute("data-pen-ui","");let n=document.createElement("div");n.className="pen-sheet-head",n.innerHTML='<div class="pen-sheet-grab"></div>';let i=document.createElement("button");i.className="pen-sheet-close",i.setAttribute("aria-label","Close"),i.textContent="\u2715",i.addEventListener("click",r=>{r.stopPropagation(),o.onClose()}),n.appendChild(i);let a=document.createElement("div");return a.className="pen-sheet-body",a.appendChild(e),t.appendChild(n),t.appendChild(a),o.footer&&t.appendChild(o.footer),t}positionSheet(e){let o=window.visualViewport;if(!o){e.style.maxHeight="50vh";return}let t=Math.max(0,window.innerHeight-o.height-o.offsetTop);e.style.bottom=`${t}px`,e.style.maxHeight=`${Math.round(Math.min(window.innerHeight*.5,o.height-12))}px`}repositionSheets(){this.layer.querySelectorAll(".pen-sheet").forEach(e=>this.positionSheet(e))}dockBox(e,o,t){if(this.isMobile()){let n=this.wrapSheet(e,{onClose:t});this.layer.appendChild(n),this.composeRoot=n,this.positionSheet(n)}else e.style.left=`${Math.min(window.scrollX+o.left,window.scrollX+window.innerWidth-372)}px`,e.style.top=`${window.scrollY+o.bottom+8}px`,this.layer.appendChild(e),this.composeRoot=e}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!oe)return;let e=window.CSS.highlights,o=globalThis.Highlight;if(this.responsePanel)return;if(!this.highlightsOn){e.delete("penumbra-quote"),e.delete("penumbra-quote-active"),e.delete("penumbra-draft");return}let t=this.blocks.flatMap(i=>i.ranges);t.length?e.set("penumbra-quote",new o(...t)):e.delete("penumbra-quote"),this.composeCtx?.range?e.set("penumbra-draft",new o(this.composeCtx.range)):e.delete("penumbra-draft");let n=this.blockById(this.hovered??this.focused)?.ranges[0];n?e.set("penumbra-quote-active",new o(n)):e.delete("penumbra-quote-active")}layoutRightRail(){if(this.railRO?.disconnect(),this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-cardemoji, .pen-sheet").forEach(n=>n.remove()),this.cardEmojiRow=void 0,this.railEntries=[],!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect();if(window.innerWidth-e.right<300)return;this.railLeft=window.scrollX+e.right+24;let o=this.cards().sort((n,i)=>this.docY(n.ranges[0])-this.docY(i.ranges[0]));if(!o.length)return;for(let n of o){let i=this.buildCard(n,this.focused===n.id);i.style.left=`${this.railLeft}px`,i.style.top="-9999px",this.layer.appendChild(i),this.railEntries.push({el:i,blk:n})}let t=this.railEntries.find(n=>n.blk.id===this.focused);if(t){let n=document.createElement("div");n.className="pen-cardemoji",n.setAttribute("data-pen-ui",""),n.appendChild(this.buildEmojiPanel(()=>t.blk.emojis,i=>this.toggleCardEmoji(t.blk,i,t.el))),this.layer.appendChild(n),this.cardEmojiRow=n}this.railRO=new ResizeObserver(()=>this.queueReposition()),this.railEntries.forEach(n=>this.railRO.observe(n.el)),this.repositionRail(),t&&this.mountCardEditor(t.el,t.blk)}async mountCardEditor(e,o){let t=e.querySelector("[data-note-editor]");if(!t)return;let n;try{n=await U()}catch{return}this.focused!==o.id||!t.isConnected||(this.destroyCardEditor(),t.textContent="",this.cardEditor=n(t,o.text,{onChange:i=>{o.text=i,o.note=this.composeNote(o.emojis,i),this.queueReposition(),this.saveQuiet(e)},uploadImage:i=>this.api.uploadImage(i)}),this.isMobile()||this.cardEditor.focus())}destroyCardEditor(){this.cardEditor&&(this.flushQuiet(),this.cardEditor.destroy(),this.cardEditor=void 0)}queueReposition(){this.repoQueued||(this.repoQueued=!0,requestAnimationFrame(()=>{this.repoQueued=!1,this.repositionRail()}))}repositionRail(){if(this.isMobile())return;let e=this.railEntries;if(!e.length)return;let o=e.findIndex(r=>r.blk.id===this.focused),t=this.cardEmojiRow?this.cardEmojiRow.offsetHeight+8:0,n=e.map((r,p)=>r.el.offsetHeight+(p===o?t:r.blk.emojis.length&&r.blk.id!==this.focused?11:0)),i=e.map(r=>r.blk.ranges[0]?this.docY(r.blk.ranges[0]):0),a=i.slice();if(o>=0){a[o]=i[o];for(let r=o+1;r<e.length;r++)a[r]=Math.max(i[r],a[r-1]+n[r-1]+q);for(let r=o-1;r>=0;r--)a[r]=Math.min(i[r],a[r+1]-n[r]-q)}else for(let r=1;r<e.length;r++)a[r]=Math.max(i[r],a[r-1]+n[r-1]+q);e.forEach((r,p)=>r.el.style.top=`${Math.max(0,a[p])}px`),this.cardEmojiRow&&o>=0&&(this.cardEmojiRow.style.left=`${this.railLeft}px`,this.cardEmojiRow.style.top=`${Math.max(0,a[o])+e[o].el.offsetHeight+8}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote-stack").forEach(n=>n.remove()),!this.highlightsOn||this.responsePanel||this.isMobile())return;let e=this.root.getBoundingClientRect(),o=window.scrollX+e.left-8,t=0;for(let n of this.emojiBlocks().sort((i,a)=>this.docY(i.ranges[0])-this.docY(a.ranges[0]))){let i=document.createElement("div"),a=this.hovered===n.id||this.focused===n.id;i.className=`pen-emote-stack${a?" pen-emph":""}`,i.setAttribute("data-pen-ui",""),i.dataset.blockId=n.id,i.innerHTML=n.emojis.slice().reverse().map(p=>`<span class="pen-emote">${f(p)}</span>`).join(""),i.title=u(n.text)?"Open comment":"Edit reaction",i.addEventListener("mouseenter",()=>this.setHovered(n.id)),i.addEventListener("mouseleave",()=>this.setHovered(null)),i.addEventListener("click",()=>u(n.text)?this.focus(n.id):this.editBlock(n)),this.layer.appendChild(i);let r=Math.max(this.docY(n.ranges[0]),t+6);i.style.left=`${o}px`,i.style.top=`${r}px`,t=r+i.offsetHeight}}buildCard(e,o){let t=document.createElement("div");t.className=`pen-card rail ${o?"focused":"compact"}`,t.setAttribute("data-pen-ui",""),t.dataset.blockId=e.id;let n=e.quotes.map(i=>`<div class="pen-quote">${f(i)}</div>`).join("");if(o){t.innerHTML=`${n}
        <div class="pen-note-editor" data-note-editor><div class="pen-md">${g(e.text)}</div></div>
        <span class="pen-savestate" data-cardsave></span>
        <div class="pen-trashbox">
          <button class="pen-trash" data-act="del-init" title="Delete comment">${re}</button>
          <div class="pen-trashconfirm" data-confirm hidden>
            <button class="pen-trash pen-yes" data-act="del-yes" title="Confirm delete">\u2713</button>
            <button class="pen-trash pen-no" data-act="del-no" title="Cancel">\u2715</button>
          </div></div>`;let i=t.querySelector("[data-confirm]"),a=t.querySelector('[data-act="del-init"]');a.addEventListener("click",()=>{a.style.display="none",i.hidden=!1}),t.querySelector('[data-act="del-no"]').addEventListener("click",()=>{i.hidden=!0,a.style.display=""}),t.querySelector('[data-act="del-yes"]').addEventListener("click",()=>{e.emojis.length?(e.text="",e.note=this.composeNote(e.emojis,"")):this.blocks=this.blocks.filter(r=>r.id!==e.id),this.saveDoc()})}else{let i=u(e.text)?`<div class="pen-md">${g(e.text)}</div>`:'<div class="pen-md pen-muted">Add a comment\u2026</div>',a=e.emojis.length?`<div class="pen-card-emoji">${e.emojis.map(r=>`<span>${f(r)}</span>`).join("")}</div>`:"";t.innerHTML=`${n}<div class="pen-thread">${i}</div>${a}`,t.addEventListener("click",()=>this.focus(e.id))}return t.addEventListener("mouseenter",()=>this.setHovered(e.id)),t.addEventListener("mouseleave",()=>this.setHovered(null)),t}focus(e){this.focused=e,this.renderAll()}toggleCardEmoji(e,o,t){this.cardEditor&&(e.text=this.cardEditor.getMarkdown());let n=e.emojis.indexOf(o);n>=0?e.emojis.splice(n,1):e.emojis.length<$&&e.emojis.push(o),e.note=this.composeNote(e.emojis,e.text),this.layoutLeftRail(),this.queueReposition(),this.saveQuiet(t);let i=this.cardEditor;requestAnimationFrame(()=>i?.refocus())}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-block-id]").forEach(o=>o.classList.toggle("pen-emph",o.dataset.blockId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||this.responsePanel||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let o=null;for(let t of this.blocks)if(t.ranges.some(n=>this.hitsRange(e,n))){o=t.id;break}this.setHovered(o)}))}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let o=e.getRangeAt(0);if(this.root.contains(o.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(o.cloneRange());return}this.openCompose(o.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let o=e.getBoundingClientRect(),t=document.createElement("button");t.className="pen-addbtn",t.setAttribute("data-pen-ui",""),t.textContent="Quote",t.style.left=`${window.scrollX+o.left+o.width/2}px`,t.style.top=`${window.scrollY+o.top}px`,t.onmousedown=n=>{n.preventDefault(),n.stopPropagation()},t.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(t),this.quoteBtn=t}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}async openCompose(e,o){if(!this.user){e&&this.promptSignIn(e);return}let t="";if(o?t=o.quotes[0]??"":e&&(t=H(e,this.root)?.find(c=>c.type==="TextQuoteSelector")?.exact??""),!t)return;let n=e??o?.ranges[0]??null;if(!n)return;this.dismissCompose();let i=o??{id:`b${this.blocks.length}`,quotes:[t],nths:[z(e,this.root)],note:"",emojis:[],text:"",ranges:[e.cloneRange()]},a=n.getBoundingClientRect(),r=document.createElement("div");r.className="pen-compose",r.setAttribute("data-pen-ui",""),r.innerHTML='<div class="pen-note-editor" data-note-editor></div><div data-emojislot></div>',r.querySelector("[data-emojislot]").appendChild(this.buildEmojiPanel(()=>i.emojis,c=>this.toggleComposeEmoji(c))),this.dockBox(r,a,()=>this.dismissCompose()),this.compose=r,this.composeBlock=i,this.composeNew=!o,e&&(this.composeCtx={range:e,quote:t},this.renderHighlights());let p;try{p=await U()}catch{return}if(this.compose!==r)return;let h=r.querySelector("[data-note-editor]");this.composeEditor=p(h,i.text,{onChange:c=>{i.text=c,i.note=this.composeNote(i.emojis,c),this.graftCompose(),this.saveQuiet()},uploadImage:c=>this.api.uploadImage(c),onSubmit:()=>this.dismissCompose()}),this.composeEditor.focus()}editBlock(e){this.openCompose(null,e)}composeWorthKeeping(e){return e.emojis.length>0||u(e.text)}graftCompose(){let e=this.composeBlock;if(!e||!this.composeNew)return;let o=this.blocks.includes(e),t=this.composeWorthKeeping(e);t&&!o?this.blocks.push(e):!t&&o&&(this.blocks=this.blocks.filter(n=>n!==e))}toggleComposeEmoji(e){let o=this.composeBlock;if(!o)return;this.composeEditor&&(o.text=this.composeEditor.getMarkdown());let t=o.emojis.indexOf(e);if(t>=0)o.emojis.splice(t,1),o.note=this.composeNote(o.emojis,o.text),this.graftCompose(),this.layoutLeftRail(),this.saveQuiet();else if(o.emojis.length<$){let n=o.emojis.length===0;o.emojis.push(e),o.note=this.composeNote(o.emojis,o.text),n?this.finalizeCompose():(this.graftCompose(),this.layoutLeftRail(),this.saveQuiet())}}promptSignIn(e){this.dismissCompose();let o=e.getBoundingClientRect(),t=document.createElement("div");t.className="pen-compose",t.setAttribute("data-pen-ui",""),t.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,t.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.dockBox(t,o,()=>this.dismissCompose()),this.compose=t}buildEmojiPanel(e,o){let t=document.createElement("div");t.className="pen-emojipanel",t.innerHTML=`
      <div class="pen-emojibar" data-bar></div>
      <div class="pen-emojimore" data-more hidden>
        <input class="pen-emoji-search" placeholder="Search emoji\u2026">
        <div class="pen-emojigrid" data-grid></div>
      </div>`;let n=t.querySelector("[data-bar]"),i=t.querySelector("[data-grid]"),a=t.querySelector("[data-more]"),r=t.querySelector(".pen-emoji-search");n.addEventListener("mousedown",l=>l.preventDefault()),i.addEventListener("mousedown",l=>l.preventDefault()),t.addEventListener("click",l=>l.stopPropagation());let p=(l,m)=>`<button class="${m.includes(l)?"selected":""}" data-e="${f(l)}">${f(l)}</button>`,h=()=>{let l=e(),m=r.value.trim().toLowerCase();i.innerHTML=ie.filter(([d,b])=>!m||b.includes(m)||d===r.value).map(([d])=>p(d,l)).join(""),i.querySelectorAll("[data-e]").forEach(d=>d.addEventListener("click",b=>{b.stopPropagation(),P(d.dataset.e)}))},c=()=>{let l=e(),m=ne.filter(d=>!l.includes(d)).slice(0,Math.max(0,$-l.length));n.innerHTML=l.map(d=>p(d,l)).join("")+m.map(d=>p(d,l)).join("")+'<button class="pen-emoji-more" data-act="more" title="More emoji">\uFF0B</button>',n.querySelectorAll("[data-e]").forEach(d=>d.addEventListener("click",b=>{b.stopPropagation(),P(d.dataset.e)})),n.querySelector('[data-act="more"]').addEventListener("click",d=>{d.stopPropagation(),a.hidden=!a.hidden,a.hidden||(h(),r.focus())})},P=l=>{o(l),c(),a.hidden||h()};return r.addEventListener("input",h),c(),t}teardownCompose(){clearTimeout(this.quietTimer),this.composeEditor?.destroy(),this.composeEditor=void 0,this.composeBlock=void 0,this.composeNew=!1,(this.composeRoot??this.compose)?.remove(),this.compose=void 0,this.composeRoot=void 0,this.composeCtx=void 0}finalizeCompose(){if(!this.compose)return;let e=this.composeBlock;if(e&&this.composeEditor&&(e.text=this.composeEditor.getMarkdown(),e.note=this.composeNote(e.emojis,e.text)),e){let o=this.composeWorthKeeping(e);o&&!this.blocks.includes(e)?this.blocks.push(e):o||(this.blocks=this.blocks.filter(t=>t!==e))}this.teardownCompose(),window.getSelection()?.removeAllRanges(),this.saveDoc()}dismissCompose(){if(!this.compose){this.renderHighlights();return}this.finalizeCompose()}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.removeQuoteBtn())}onDocClick(e){if(!this.responsePanel&&!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let o of this.blocks)if(o.ranges.some(t=>this.hitsRange(e,t)))return u(o.text)?this.focus(o.id):this.editBlock(o);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,o){for(let t of o.getClientRects())if(e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom)return!0;return!1}renderToolbar(){this.toolbar?.remove();let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">\u2726 Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new E({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}async toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();let e;this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active");try{e=await te()}catch{this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),alert("Could not load the editor.");return}this.responsePanel||(this.destroyCardEditor(),this.layer.querySelectorAll(".pen-card.rail, .pen-emote-stack").forEach(o=>o.remove()),this.responsePanel=new e({api:this.api,root:this.root,source:this.source,commitSha:this.commitSha,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.loadDoc()}}),this.responsePanel.open())}showTooltip(e,o){this.hideTooltip();let t=document.createElement("div");t.className="pen-tooltip",t.setAttribute("data-pen-ui",""),t.textContent=o,this.layer.appendChild(t);let n=e.getBoundingClientRect();t.style.left=`${window.scrollX+n.right+8}px`,t.style.top=`${window.scrollY+n.top}px`,this.tooltip=t}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${f(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.loadDoc()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let o=async()=>{let t=e.querySelector("input"),n=t.value.trim();if(!n)return;let i=await this.api.emailLogin(n);i.link?location.href=i.link:(t.value="",t.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",o),e.querySelector("input").addEventListener("keydown",t=>{t.key==="Enter"&&o()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},f=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function Y(){let s=window.PENUMBRA;if(!s?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new T(s);window.penumbra=e,e.init().catch(o=>console.error("[penumbra] init failed",o)),document.addEventListener("nav",()=>e.reload().catch(o=>console.error("[penumbra] reload failed",o)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Y):Y();})();
//# sourceMappingURL=penumbra.js.map
