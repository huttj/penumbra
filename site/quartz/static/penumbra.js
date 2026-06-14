"use strict";(()=>{var b="penumbra:token",m=class{constructor(e){this.base=e}get token(){return localStorage.getItem(b)}set token(e){e?localStorage.setItem(b,e):localStorage.removeItem(b)}headers(e=!1){let t={};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let t=await e.json();return{user:t.user,isAuthor:!!t.isAuthor}}async list(e,t=[]){let n=new URLSearchParams({source:e});t.length&&n.set("include",t.join(","));let o=await fetch(`${this.base}/annotations?${n}`);return o.ok?(await o.json()).items:[]}async create(e,t,n={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:n.kind??"comment",body:[{type:"TextualBody",value:t}],docVersion:n.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:t})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(t)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let t=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${t}`,{method:"DELETE",headers:this.headers()})}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function k(i){let e=document.createTreeWalker(i,NodeFilter.SHOW_TEXT,{acceptNode(r){let a=r.parentElement;return a&&a.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[],n="",o;for(;o=e.nextNode();){let r=o,a=n.length;n+=r.data,t.push({node:r,start:a,end:n.length})}return{text:n,nodes:t}}function y(i,e){for(let n of i.nodes)if(e>=n.start&&e<=n.end)return{node:n.node,offset:e-n.start};let t=i.nodes[i.nodes.length-1];return t?{node:t.node,offset:t.node.data.length}:null}function w(i,e,t){if(e.nodeType===Node.TEXT_NODE){let r=i.nodes.find(a=>a.node===e);return r?r.start+t:null}let n=e.childNodes[t]??e.childNodes[e.childNodes.length-1];if(!n)return null;let o=i.nodes.find(r=>r.node===n||n.contains(r.node));return o?o.start:null}function E(i,e){let t=k(e),n=w(t,i.startContainer,i.startOffset),o=w(t,i.endContainer,i.endOffset);if(n==null||o==null||o<=n)return null;let r=t.text.slice(n,o),a=t.text.slice(Math.max(0,n-32),n),s=t.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:r,prefix:a,suffix:s},{type:"TextPositionSelector",start:n,end:o}]}function v(i,e){let t=k(e),n=i.find(d=>d.type==="TextQuoteSelector"),o=i.find(d=>d.type==="TextPositionSelector"),r=-1,a=-1;if(n&&n.exact){let d=$(t.text,n);d>=0&&(r=d,a=d+n.exact.length)}if(r<0&&o&&t.text.slice(o.start,o.end)&&(r=o.start,a=o.end),r<0)return null;let s=y(t,r),l=y(t,a);if(!s||!l)return null;let g=document.createRange();return g.setStart(s.node,s.offset),g.setEnd(l.node,l.offset),g}function $(i,e){let t=[],n=i.indexOf(e.exact);for(;n>=0;)t.push(n),n=i.indexOf(e.exact,n+1);if(t.length===0)return-1;if(t.length===1)return t[0];let o=t[0],r=-1;for(let a of t){let s=0;if(e.prefix){let l=i.slice(Math.max(0,a-e.prefix.length),a);s+=M(l,e.prefix)}if(e.suffix){let l=i.slice(a+e.exact.length,a+e.exact.length+e.suffix.length);s+=R(l,e.suffix)}s>r&&(r=s,o=a)}return o}var R=(i,e)=>{let t=0;for(;t<i.length&&t<e.length&&i[t]===e[t];)t++;return t},M=(i,e)=>{let t=0;for(;t<i.length&&t<e.length&&i[i.length-1-t]===e[e.length-1-t];)t++;return t};var x=`
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
  transition: top .18s ease, box-shadow .18s ease; overflow: hidden;
}
.pen-card.compact { cursor: pointer; }
.pen-card.compact:hover { border-color: var(--pen-accent); }
.pen-card.focused { box-shadow: 0 0 0 2px var(--pen-accent), var(--pen-shadow); }
.pen-card.floating { position: absolute; }

.pen-quote {
  font-size: 12px; color: var(--pen-muted); border-left: 3px solid var(--pen-accent);
  padding: 6px 10px; margin: 10px 10px 0; background: var(--pen-chip);
  border-radius: 0 6px 6px 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.pen-thread { padding: 8px 12px 10px; }
.pen-comment { padding: 6px 0; }
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

.pen-reply { padding: 0 12px 12px; }
.pen-reply textarea, .pen-compose textarea {
  width: 100%; min-height: 54px; resize: vertical; font: inherit;
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
.pen-compose { position: absolute; width: 300px; z-index: 2147483646;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 11px;
  box-shadow: var(--pen-shadow); padding: 10px; }
.pen-emojibar { display: flex; gap: 4px; margin-top: 8px; }
.pen-emojibar button { font-size: 18px; background: var(--pen-chip); border: 1px solid var(--pen-border);
  border-radius: 8px; padding: 3px 7px; cursor: pointer; line-height: 1.2; }
.pen-emojibar button:hover { background: var(--pen-chip-hover); transform: scale(1.08); }

.pen-addbtn {
  position: absolute; z-index: 2147483646; transform: translate(-50%, -118%);
  background: var(--pen-fg); color: var(--pen-bg); border: none; border-radius: 7px;
  padding: 6px 11px; font-size: 13px; font-weight: 600; cursor: pointer; box-shadow: var(--pen-shadow);
}

/* ---- emoji reactions (left rail) ---- */
.pen-emote {
  position: absolute; z-index: 2147483644; cursor: default;
  background: var(--pen-bg); border: 1px solid var(--pen-border); border-radius: 14px;
  padding: 1px 6px; font-size: 14px; box-shadow: var(--pen-shadow); white-space: nowrap;
}
.pen-emote .pen-emote-count { font-size: 11px; color: var(--pen-muted); margin-left: 2px; }
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
`;var H=typeof globalThis.Highlight<"u"&&!!x&&!!window.CSS?.highlights,N=10,O=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],f=class{constructor(e){this.user=null;this.isAuthor=!1;this.items=new Map;this.highlightsOn=!0;this.filter="all";this.focused=null;this.narrow=!1;this.relayoutQueued=!1;this.kindOf=e=>e["penumbra:kind"]??"comment";this.acknowledged=e=>!!e["penumbra:acknowledged"];this.repliesOf=e=>e["penumbra:replies"]??[];this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cfg=e,this.api=new m(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.docVersion=e.docVersion}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){let e=document.createElement("style");e.textContent=x,document.head.appendChild(e),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let t=await this.api.me();this.user=t.user,this.isAuthor=t.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadAnnotations(),document.addEventListener("mouseup",()=>setTimeout(()=>this.onSelection(),0)),document.addEventListener("mousedown",n=>this.onDocMouseDown(n)),document.addEventListener("click",n=>this.onDocClick(n)),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.removeAddBtn(),this.focused=null,this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadAnnotations()}async loadAnnotations(){let e=await this.api.list(this.source);this.items.clear();for(let t of e)this.items.set(t.id,{anno:t,range:v(t.target.selector,this.root)});this.renderAll()}comments(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="comment")}emojis(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="emoji")}passesFilter(e){switch(this.filter){case"unread":return!this.acknowledged(e);case"mine":{let t=this.user?.id;return!!t&&(e.creator?.id===t||this.repliesOf(e).some(n=>n.creator?.id===t))}case"author":return e.creator?.authored||this.repliesOf(e).some(t=>t.creator?.authored);default:return!0}}visibleComments(){return this.comments().filter(e=>e.range&&this.passesFilter(e.anno)).sort((e,t)=>this.docY(e.range)-this.docY(t.range))}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail(),this.updateToolbar()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!H)return;let e=window.CSS.highlights;if(!this.highlightsOn){e.delete("penumbra"),e.delete("penumbra-active");return}let t=this.visibleComments().map(o=>o.range).concat(this.emojis().filter(o=>o.range&&this.passesFilter(o.anno)).map(o=>o.range));e.set("penumbra",new globalThis.Highlight(...t));let n=this.focused&&this.items.get(this.focused)?.range;n?e.set("penumbra-active",new globalThis.Highlight(n)):e.delete("penumbra-active")}layoutRightRail(){if(this.layer.querySelectorAll(".pen-card.rail").forEach(r=>r.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect(),t=window.innerWidth-e.right;if(this.narrow=t<320,this.narrow)return;let n=window.scrollX+e.right+24,o=0;for(let r of this.visibleComments()){let a=this.buildCommentCard(r,this.focused===r.anno.id,"rail");this.layer.appendChild(a),a.style.left=`${n}px`;let s=this.docY(r.range),l=Math.max(s,o+N);a.style.top=`${l}px`,o=l+a.offsetHeight}}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote").forEach(o=>o.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect(),t=window.scrollX+Math.max(6,e.left-40),n=0;for(let o of this.emojis().filter(r=>r.range&&this.passesFilter(r.anno)).sort((r,a)=>this.docY(r.range)-this.docY(a.range))){let r=o.anno,a=document.createElement("div");a.className="pen-emote",a.setAttribute("data-pen-ui",""),a.textContent=r.body?.[0]?.value??"\u2B50";let s=`${r.creator?.name??"someone"} reacted`;a.addEventListener("mouseenter",()=>this.showTooltip(a,s)),a.addEventListener("mouseleave",()=>this.hideTooltip()),this.layer.appendChild(a);let l=Math.max(this.docY(o.range),n+6);a.style.left=`${t}px`,a.style.top=`${l}px`,n=l+a.offsetHeight}}buildCommentCard(e,t,n){let o=e.anno,r=o.id,a=document.createElement("div");a.className=`pen-card ${n} ${t?"focused":"compact"}`,a.setAttribute("data-pen-ui",""),a.dataset.annoId=r;let s=o.target.selector.find(c=>c.type==="TextQuoteSelector")?.exact??"",l=this.repliesOf(o),g=!this.acknowledged(o),d=(c,p)=>{let T=c.creator?.avatar?`<img src="${u(c.creator.avatar)}" alt="">`:"",A=c.creator?.authored?'<span class="pen-badge">author</span>':"",C=p&&g?'<span class="pen-unread-dot" title="unread"></span>':"",L=p?o.body?.[0]?.value??"":c.body;return`<div class="pen-comment">
        <div class="pen-meta">${C}${T}<span class="pen-name">${u(c.creator?.name??"anon")}</span>${A}
          <span>\xB7 ${j(p?o.created:c.created)}</span></div>
        <div class="pen-body">${u(L)}</div></div>`},h=`<div class="pen-quote">${u(s)}</div><div class="pen-thread">`;if(h+=d({creator:o.creator,created:o.created},!0),!t)l.length&&(h+=`<div class="pen-more">${l.length} repl${l.length===1?"y":"ies"} \u2192</div>`);else for(let c of l)h+=d(c,!1);if(h+="</div>",t){let c=this.user&&o.creator?.id===this.user.id,p=[];this.isAuthor&&p.push(`<a data-act="ack">${this.acknowledged(o)?"Mark unread":"Acknowledge"}</a>`),c&&(p.push('<a data-act="resolve">Resolve</a>'),p.push('<a data-act="delete">Delete</a>')),p.length&&(h+=`<div class="pen-actions">${p.join("")}</div>`),this.user?h+=`<div class="pen-reply"><textarea placeholder="Reply\u2026"></textarea>
          <div class="pen-row"><span></span><button class="pen-btn" data-act="send-reply">Reply</button></div></div>`:h+='<div class="pen-actions"><a data-act="login">Sign in to reply</a></div>'}return a.innerHTML=h,t?(a.querySelector('[data-act="ack"]')?.addEventListener("click",()=>this.toggleAck(r)),a.querySelector('[data-act="resolve"]')?.addEventListener("click",()=>this.resolve(r)),a.querySelector('[data-act="delete"]')?.addEventListener("click",()=>this.remove(r)),a.querySelector('[data-act="login"]')?.addEventListener("click",()=>this.flashLogin()),a.querySelector('[data-act="send-reply"]')?.addEventListener("click",()=>{let c=a.querySelector("textarea");c?.value.trim()&&this.sendReply(r,c.value.trim())})):a.addEventListener("click",()=>this.focus(r)),a}focus(e,t=!1){this.focused=e;let n=this.items.get(e);t&&n?.range&&window.scrollTo({top:this.docY(n.range)-120,behavior:"smooth"}),this.narrow?this.openFloatingCard(e):this.renderAll(),this.renderHighlights()}nav(e){let t=this.visibleComments();if(!t.length)return;let n=t.findIndex(o=>o.anno.id===this.focused);n=n<0?e>0?0:t.length-1:(n+e+t.length)%t.length,this.focus(t[n].anno.id,!0)}openFloatingCard(e){this.dismissCompose(),this.layer.querySelectorAll(".pen-card.floating").forEach(s=>s.remove());let t=this.items.get(e);if(!t)return;let n=this.buildCommentCard(t,!0,"floating"),o=t.range?.getBoundingClientRect(),r=o?window.scrollY+o.bottom+8:window.scrollY+80,a=Math.min(window.scrollX+(o?.left??40),window.scrollX+window.innerWidth-310);n.style.top=`${r}px`,n.style.left=`${Math.max(8,a)}px`,this.layer.appendChild(n)}async sendReply(e,t){try{await this.api.reply(e,t)}catch(n){alert(n.message);return}await this.loadAnnotations(),this.focus(e)}async toggleAck(e){let t=this.items.get(e)?.anno;t&&(await this.api.patch(e,{acknowledged:!this.acknowledged(t)}).catch(n=>alert(n.message)),await this.loadAnnotations(),this.focus(e))}async resolve(e){await this.api.patch(e,{status:"resolved"}).catch(t=>alert(t.message)),this.items.delete(e),this.focused=null,this.renderAll()}async remove(e){confirm("Delete this comment thread?")&&(await this.api.remove(e),this.items.delete(e),this.focused=null,this.renderAll())}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0)return this.removeAddBtn();let t=e.getRangeAt(0);if(!this.root.contains(t.commonAncestorContainer)||!e.toString().trim())return this.removeAddBtn();let n=t.getBoundingClientRect();this.removeAddBtn();let o=document.createElement("button");o.className="pen-addbtn",o.setAttribute("data-pen-ui",""),o.textContent="\u{1F4AC} Comment",o.style.left=`${window.scrollX+n.left+n.width/2}px`,o.style.top=`${window.scrollY+n.top}px`,o.onmousedown=r=>{r.preventDefault(),r.stopPropagation()},o.onclick=()=>this.openCompose(t),this.layer.appendChild(o),this.addBtn=o}removeAddBtn(){this.addBtn?.remove(),this.addBtn=void 0}dismissCompose(){this.compose?.remove(),this.compose=void 0}openCompose(e){if(!this.user)return this.removeAddBtn(),this.flashLogin();let t=E(e,this.root);if(!t)return this.removeAddBtn();let n=t.find(s=>s.type==="TextQuoteSelector")?.exact??"",o=e.getBoundingClientRect();this.removeAddBtn(),this.dismissCompose();let r=document.createElement("div");r.className="pen-compose",r.setAttribute("data-pen-ui",""),r.style.left=`${Math.min(window.scrollX+o.left,window.scrollX+window.innerWidth-312)}px`,r.style.top=`${window.scrollY+o.bottom+8}px`,r.innerHTML=`<div class="pen-quote">${u(n)}</div>
      <textarea placeholder="Add a comment\u2026"></textarea>
      <div class="pen-emojibar">${O.map(s=>`<button data-emoji="${s}">${s}</button>`).join("")}</div>
      <div class="pen-row"><span class="pen-title">or react \u2191</span><span>
        <button class="pen-btn ghost" data-act="cancel">Cancel</button>
        <button class="pen-btn" data-act="post">Comment</button></span></div>`;let a=r.querySelector("textarea");a.focus(),r.querySelectorAll("[data-emoji]").forEach(s=>s.addEventListener("click",()=>this.create(t,s.dataset.emoji,"emoji"))),r.querySelector('[data-act="cancel"]').addEventListener("click",()=>this.dismissCompose()),r.querySelector('[data-act="post"]').addEventListener("click",()=>{a.value.trim()&&this.create(t,a.value.trim(),"comment")}),this.layer.appendChild(r),this.compose=r}async create(e,t,n){try{let o=await this.api.create({source:this.source,selector:e},t,{kind:n,docVersion:this.docVersion});this.items.set(o.id,{anno:o,range:v(o.target.selector,this.root)}),this.dismissCompose(),window.getSelection()?.removeAllRanges(),n==="comment"&&(this.focused=o.id),this.renderAll()}catch(o){alert("Could not save: "+o.message)}}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.layer.querySelectorAll(".pen-card.floating").forEach(t=>t.remove()))}onDocClick(e){if(!e.target.closest("[data-pen-ui]")){for(let t of this.comments())if(t.range){for(let n of t.range.getClientRects())if(e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom){this.focus(t.anno.id);return}}}}renderToolbar(){let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn" data-act="toggle" title="Show/hide highlights">\u2726 <span data-label>Highlights</span></button>
      <span class="pen-sep"></span>
      <select data-act="filter" title="Filter">
        <option value="all">All</option>
        <option value="unread">Unread</option>
        <option value="mine">Mine</option>
        <option value="author">Author replies</option>
      </select>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="prev" title="Previous">\u2039</button>
      <span class="pen-count" data-count>0</span>
      <button class="pen-tbtn" data-act="next" title="Next">\u203A</button>`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="toggle"]').classList.add("active"),e.querySelector('[data-act="filter"]').addEventListener("change",t=>{this.filter=t.target.value,this.focused=null,this.renderAll()}),e.querySelector('[data-act="prev"]').addEventListener("click",()=>this.nav(-1)),e.querySelector('[data-act="next"]').addEventListener("click",()=>this.nav(1)),document.body.appendChild(e),this.toolbar=e}updateToolbar(){if(!this.toolbar)return;let e=this.visibleComments(),t=e.findIndex(n=>n.anno.id===this.focused);this.toolbar.querySelector("[data-count]").textContent=e.length?`${t>=0?t+1:"\u2013"}/${e.length}`:"0"}showTooltip(e,t){this.hideTooltip();let n=document.createElement("div");n.className="pen-tooltip",n.setAttribute("data-pen-ui",""),n.textContent=t,this.layer.appendChild(n);let o=e.getBoundingClientRect();n.style.left=`${window.scrollX+o.right+8}px`,n.style.top=`${window.scrollY+o.top}px`,this.tooltip=n}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user?(e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${u(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.renderAll()})):(e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers">
          <button class="pen-btn" data-act="github">GitHub</button>
          <button class="pen-btn" data-act="google">Google</button></div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn ghost" data-act="email">Email link</button></div>`,e.querySelector('[data-act="github"]').addEventListener("click",()=>location.href=this.api.loginUrl("github")),e.querySelector('[data-act="google"]').addEventListener("click",()=>location.href=this.api.loginUrl("google")),e.querySelector('[data-act="email"]').addEventListener("click",async()=>{let t=e.querySelector("input").value.trim();if(!t)return;let n=await this.api.emailLogin(t);n.link?location.href=n.link:alert("Check your email for a sign-in link.")})),document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},u=i=>String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),j=i=>{try{return new Date(i).toLocaleDateString()}catch{return""}};function S(){let i=window.PENUMBRA;if(!i?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new f(i);window.penumbra=e,e.init().catch(t=>console.error("[penumbra] init failed",t)),document.addEventListener("nav",()=>e.reload().catch(t=>console.error("[penumbra] reload failed",t)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",S):S();})();
//# sourceMappingURL=penumbra.js.map
