"use strict";(()=>{var v="penumbra:token",f=class{constructor(e){this.base=e}get token(){return localStorage.getItem(v)}set token(e){e?localStorage.setItem(v,e):localStorage.removeItem(v)}headers(e=!1){let t={};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let t=await e.json();return{user:t.user,isAuthor:!!t.isAuthor}}async list(e,t=[]){let n=new URLSearchParams({source:e});t.length&&n.set("include",t.join(","));let o=await fetch(`${this.base}/annotations?${n}`);return o.ok?(await o.json()).items:[]}async create(e,t,n={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:n.kind??"comment",body:[{type:"TextualBody",value:t}],docVersion:n.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:t})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(t)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let t=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${t}`,{method:"DELETE",headers:this.headers()})}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function S(s){let e=document.createTreeWalker(s,NodeFilter.SHOW_TEXT,{acceptNode(r){let i=r.parentElement;return i&&i.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[],n="",o;for(;o=e.nextNode();){let r=o,i=n.length;n+=r.data,t.push({node:r,start:i,end:n.length})}return{text:n,nodes:t}}function k(s,e){for(let n of s.nodes)if(e>=n.start&&e<=n.end)return{node:n.node,offset:e-n.start};let t=s.nodes[s.nodes.length-1];return t?{node:t.node,offset:t.node.data.length}:null}function E(s,e,t){if(e.nodeType===Node.TEXT_NODE){let r=s.nodes.find(i=>i.node===e);return r?r.start+t:null}let n=e.childNodes[t]??e.childNodes[e.childNodes.length-1];if(!n)return null;let o=s.nodes.find(r=>r.node===n||n.contains(r.node));return o?o.start:null}function T(s,e){let t=S(e),n=E(t,s.startContainer,s.startOffset),o=E(t,s.endContainer,s.endOffset);if(n==null||o==null||o<=n)return null;let r=t.text.slice(n,o),i=t.text.slice(Math.max(0,n-32),n),l=t.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:r,prefix:i,suffix:l},{type:"TextPositionSelector",start:n,end:o}]}function x(s,e){let t=S(e),n=s.find(c=>c.type==="TextQuoteSelector"),o=s.find(c=>c.type==="TextPositionSelector"),r=-1,i=-1;if(n&&n.exact){let c=R(t.text,n);c>=0&&(r=c,i=c+n.exact.length)}if(r<0&&o&&t.text.slice(o.start,o.end)&&(r=o.start,i=o.end),r<0)return null;let l=k(t,r),d=k(t,i);if(!l||!d)return null;let a=document.createRange();return a.setStart(l.node,l.offset),a.setEnd(d.node,d.offset),a}function R(s,e){let t=[],n=s.indexOf(e.exact);for(;n>=0;)t.push(n),n=s.indexOf(e.exact,n+1);if(t.length===0)return-1;if(t.length===1)return t[0];let o=t[0],r=-1;for(let i of t){let l=0;if(e.prefix){let d=s.slice(Math.max(0,i-e.prefix.length),i);l+=H(d,e.prefix)}if(e.suffix){let d=s.slice(i+e.exact.length,i+e.exact.length+e.suffix.length);l+=M(d,e.suffix)}l>r&&(r=l,o=i)}return o}var M=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[t]===e[t];)t++;return t},H=(s,e)=>{let t=0;for(;t<s.length&&t<e.length&&s[s.length-1-t]===e[e.length-1-t];)t++;return t};var y=`
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
::highlight(penumbra-draft) { background-color: rgba(120, 170, 255, 0.30); text-decoration: underline dashed; }

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
`;var I=typeof globalThis.Highlight<"u"&&!!y&&!!window.CSS?.highlights,w=10,N=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],b=class{constructor(e){this.user=null;this.isAuthor=!1;this.items=new Map;this.drafts=new Map;this.highlightsOn=!0;this.filter="all";this.focused=null;this.hovered=null;this.narrow=!1;this.draftSeq=0;this.relayoutQueued=!1;this.kindOf=e=>e["penumbra:kind"]??"comment";this.acknowledged=e=>!!e["penumbra:acknowledged"];this.repliesOf=e=>e["penumbra:replies"]??[];this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cfg=e,this.api=new f(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.docVersion=e.docVersion}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){let e=document.createElement("style");e.textContent=y,document.head.appendChild(e),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let t=await this.api.me();this.user=t.user,this.isAuthor=t.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadAnnotations(),document.addEventListener("mouseup",n=>{n.target.closest("[data-pen-ui]")||setTimeout(()=>this.onSelection(),0)}),document.addEventListener("mousedown",n=>this.onDocMouseDown(n)),document.addEventListener("click",n=>this.onDocClick(n)),document.addEventListener("keydown",n=>{n.key==="Escape"&&(this.compose?this.dismissCompose(!1):this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.drafts.clear(),this.focused=null,this.hovered=null,this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadAnnotations()}async loadAnnotations(){let e=await this.api.list(this.source);this.items.clear();for(let t of e)this.items.set(t.id,{anno:t,range:x(t.target.selector,this.root)});this.renderAll()}comments(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="comment")}emojis(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="emoji")}passesFilter(e){switch(this.filter){case"unread":return!this.acknowledged(e);case"mine":{let t=this.user?.id;return!!t&&(e.creator?.id===t||this.repliesOf(e).some(n=>n.creator?.id===t))}case"author":return e.creator?.authored||this.repliesOf(e).some(t=>t.creator?.authored);default:return!0}}visibleComments(){return this.comments().filter(e=>e.range&&this.passesFilter(e.anno)).sort((e,t)=>this.docY(e.range)-this.docY(t.range))}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail(),this.updateToolbar()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!I)return;let e=window.CSS.highlights,t=globalThis.Highlight;if(!this.highlightsOn){e.delete("penumbra"),e.delete("penumbra-active"),e.delete("penumbra-draft");return}let n=this.visibleComments().map(l=>l.range).concat(this.emojis().filter(l=>l.range&&this.passesFilter(l.anno)).map(l=>l.range));e.set("penumbra",new t(...n));let o=[...this.drafts.values()].map(l=>l.range).filter(Boolean);o.length?e.set("penumbra-draft",new t(...o)):e.delete("penumbra-draft");let r=this.hovered??this.focused,i=r&&this.items.get(r)?.range;i?e.set("penumbra-active",new t(i)):e.delete("penumbra-active")}layoutRightRail(){if(this.layer.querySelectorAll(".pen-card.rail").forEach(a=>a.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect();if(this.narrow=window.innerWidth-e.right<320,this.narrow)return;let t=this.visibleComments();if(!t.length)return;let n=window.scrollX+e.right+24,o=t.map(a=>{let c=this.buildCommentCard(a,this.focused===a.anno.id,"rail");return c.style.left=`${n}px`,c.style.top="-9999px",this.layer.appendChild(c),c}),r=o.map(a=>a.offsetHeight),i=t.map(a=>this.docY(a.range)),l=i.slice(),d=t.findIndex(a=>a.anno.id===this.focused);if(d>=0){l[d]=i[d];for(let a=d+1;a<t.length;a++)l[a]=Math.max(i[a],l[a-1]+r[a-1]+w);for(let a=d-1;a>=0;a--)l[a]=Math.min(i[a],l[a+1]-r[a]-w)}else for(let a=1;a<t.length;a++)l[a]=Math.max(i[a],l[a-1]+r[a-1]+w);o.forEach((a,c)=>a.style.top=`${Math.max(0,l[c])}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote").forEach(o=>o.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect(),t=window.scrollX+Math.max(6,e.left-40),n=0;for(let o of this.emojis().filter(r=>r.range&&this.passesFilter(r.anno)).sort((r,i)=>this.docY(r.range)-this.docY(i.range))){let r=o.anno,i=document.createElement("div");i.className="pen-emote",i.setAttribute("data-pen-ui",""),i.textContent=r.body?.[0]?.value??"\u2B50";let l=`${r.creator?.name??"someone"} reacted`;i.addEventListener("mouseenter",()=>this.showTooltip(i,l)),i.addEventListener("mouseleave",()=>this.hideTooltip()),this.layer.appendChild(i);let d=Math.max(this.docY(o.range),n+6);i.style.left=`${t}px`,i.style.top=`${d}px`,n=d+i.offsetHeight}}buildCommentCard(e,t,n){let o=e.anno,r=o.id,i=document.createElement("div");i.className=`pen-card ${n} ${t?"focused":"compact"}`,i.setAttribute("data-pen-ui",""),i.dataset.annoId=r;let l=o.target.selector.find(p=>p.type==="TextQuoteSelector")?.exact??"",d=this.repliesOf(o),a=this.isAuthor&&!this.acknowledged(o)&&!o.creator?.authored,c=(p,h)=>{let g=p.creator?.avatar?`<img src="${m(p.creator.avatar)}" alt="">`:"",L=p.creator?.authored?'<span class="pen-badge">author</span>':"",A=h&&a?'<span class="pen-unread-dot" title="unread"></span>':"",$=h?o.body?.[0]?.value??"":p.body;return`<div class="pen-comment">
        <div class="pen-meta">${A}${g}<span class="pen-name">${m(p.creator?.name??"anon")}</span>${L}
          <span>\xB7 ${O(h?o.created:p.created)}</span></div>
        <div class="pen-body">${m($)}</div></div>`},u=`<div class="pen-quote">${m(l)}</div><div class="pen-thread">`;if(u+=c({creator:o.creator,created:o.created},!0),!t)d.length&&(u+=`<div class="pen-more">${d.length} repl${d.length===1?"y":"ies"} \u2192</div>`);else for(let p of d)u+=c(p,!1);if(u+="</div>",t){let p=this.user&&o.creator?.id===this.user.id,h=[];this.isAuthor&&!o.creator?.authored&&h.push(`<a data-act="ack">${this.acknowledged(o)?"Mark unread":"Acknowledge"}</a>`),p&&h.push('<a data-act="delete">Delete</a>'),h.length&&(u+=`<div class="pen-actions">${h.join("")}</div>`),this.user?u+=`<div class="pen-reply"><textarea placeholder="Reply\u2026"></textarea>
          <div class="pen-row"><span></span><button class="pen-btn" data-act="send-reply">Reply</button></div></div>`:u+='<div class="pen-actions"><a data-act="login">Sign in to reply</a></div>'}if(i.innerHTML=u,i.addEventListener("mouseenter",()=>{this.hovered=r,this.renderHighlights()}),i.addEventListener("mouseleave",()=>{this.hovered=null,this.renderHighlights()}),!t)i.addEventListener("click",()=>this.focus(r));else{i.querySelector('[data-act="ack"]')?.addEventListener("click",()=>this.toggleAck(r)),i.querySelector('[data-act="delete"]')?.addEventListener("click",()=>this.remove(r)),i.querySelector('[data-act="login"]')?.addEventListener("click",()=>this.flashLogin());let p=i.querySelector("textarea"),h=()=>{p?.value.trim()&&this.sendReply(r,p.value.trim())};i.querySelector('[data-act="send-reply"]')?.addEventListener("click",h),p?.addEventListener("keydown",g=>{(g.metaKey||g.ctrlKey)&&g.key==="Enter"&&(g.preventDefault(),h())})}return i}focus(e,t=!1){this.focused=e;let n=this.items.get(e);t&&n?.range&&window.scrollTo({top:this.docY(n.range)-120,behavior:"smooth"}),this.narrow?this.openFloatingCard(e):this.renderAll(),this.renderHighlights()}nav(e){let t=this.visibleComments();if(!t.length)return;let n=t.findIndex(o=>o.anno.id===this.focused);n=n<0?e>0?0:t.length-1:(n+e+t.length)%t.length,this.focus(t[n].anno.id,!0)}openFloatingCard(e){this.dismissCompose(),this.layer.querySelectorAll(".pen-card.floating").forEach(l=>l.remove());let t=this.items.get(e);if(!t)return;let n=this.buildCommentCard(t,!0,"floating"),o=t.range?.getBoundingClientRect(),r=o?window.scrollY+o.bottom+8:window.scrollY+80,i=Math.min(window.scrollX+(o?.left??40),window.scrollX+window.innerWidth-310);n.style.top=`${r}px`,n.style.left=`${Math.max(8,i)}px`,this.layer.appendChild(n)}async sendReply(e,t){try{await this.api.reply(e,t)}catch(n){alert(n.message);return}await this.loadAnnotations(),this.focus(e)}async toggleAck(e){let t=this.items.get(e)?.anno;t&&(await this.api.patch(e,{acknowledged:!this.acknowledged(t)}).catch(n=>alert(n.message)),await this.loadAnnotations(),this.focus(e))}async remove(e){confirm("Delete this comment thread?")&&(await this.api.remove(e),this.items.delete(e),this.focused=null,this.renderAll())}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim())return;let t=e.getRangeAt(0);this.root.contains(t.commonAncestorContainer)&&this.openCompose(t.cloneRange())}dismissCompose(e=!1){let t=this.composeCtx;if(this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,t){let n=t.ta.value.trim();e&&n?this.drafts.set(t.draftId??`draft-${++this.draftSeq}`,{selectors:t.selectors,range:t.range,text:n}):t.draftId&&this.drafts.delete(t.draftId)}this.renderHighlights()}openCompose(e,t){if(!this.user)return this.promptSignIn(e);let n=t?.draftId?this.drafts.get(t.draftId)?.selectors:T(e,this.root);if(!n)return;this.dismissCompose();let o=e.getBoundingClientRect(),r=document.createElement("div");r.className="pen-compose",r.setAttribute("data-pen-ui",""),r.style.left=`${Math.min(window.scrollX+o.left,window.scrollX+window.innerWidth-312)}px`,r.style.top=`${window.scrollY+o.bottom+8}px`,r.innerHTML=`<textarea placeholder="Comment\u2026  (\u2318/Ctrl + \u23CE to send)"></textarea>
      <div class="pen-emojibar">${N.map(d=>`<button data-emoji="${d}">${d}</button>`).join("")}</div>
      <div class="pen-row"><span class="pen-title">or react \u2191</span>
        <button class="pen-btn" data-act="post">Comment</button></div>`;let i=r.querySelector("textarea");t?.text&&(i.value=t.text);let l=()=>{i.value.trim()&&this.create(n,i.value.trim(),"comment")};i.addEventListener("keydown",d=>{(d.metaKey||d.ctrlKey)&&d.key==="Enter"&&(d.preventDefault(),l())}),r.querySelectorAll("[data-emoji]").forEach(d=>d.addEventListener("click",()=>this.create(n,d.dataset.emoji,"emoji"))),r.querySelector('[data-act="post"]').addEventListener("click",l),this.layer.appendChild(r),this.compose=r,this.composeCtx={selectors:n,range:e,ta:i,draftId:t?.draftId??null},i.focus()}promptSignIn(e){this.dismissCompose();let t=e.getBoundingClientRect(),n=document.createElement("div");n.className="pen-compose",n.setAttribute("data-pen-ui",""),n.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-312)}px`,n.style.top=`${window.scrollY+t.bottom+8}px`,n.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,n.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.layer.appendChild(n),this.compose=n}reopenDraft(e){let t=this.drafts.get(e);t?.range&&this.openCompose(t.range,{draftId:e,text:t.text})}async create(e,t,n){let o=this.composeCtx?.draftId;try{let r=await this.api.create({source:this.source,selector:e},t,{kind:n,docVersion:this.docVersion});this.items.set(r.id,{anno:r,range:x(r.target.selector,this.root)}),o&&this.drafts.delete(o),this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,window.getSelection()?.removeAllRanges(),n==="comment"&&(this.focused=r.id),this.renderAll()}catch(r){alert("Could not save: "+r.message)}}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(!0),this.layer.querySelectorAll(".pen-card.floating").forEach(t=>t.remove()))}onDocClick(e){if(!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let[t,n]of this.drafts)if(n.range&&this.hitsRange(e,n.range))return this.reopenDraft(t);for(let t of this.comments())if(t.range&&this.hitsRange(e,t.range))return this.focus(t.anno.id);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,t){for(let n of t.getClientRects())if(e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom)return!0;return!1}renderToolbar(){let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
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
      <button class="pen-tbtn" data-act="next" title="Next">\u203A</button>`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="toggle"]').classList.add("active"),e.querySelector('[data-act="filter"]').addEventListener("change",t=>{this.filter=t.target.value,this.focused=null,this.renderAll()}),e.querySelector('[data-act="prev"]').addEventListener("click",()=>this.nav(-1)),e.querySelector('[data-act="next"]').addEventListener("click",()=>this.nav(1)),document.body.appendChild(e),this.toolbar=e}updateToolbar(){if(!this.toolbar)return;let e=this.visibleComments(),t=e.findIndex(n=>n.anno.id===this.focused);this.toolbar.querySelector("[data-count]").textContent=e.length?`${t>=0?t+1:"\u2013"}/${e.length}`:"0"}showTooltip(e,t){this.hideTooltip();let n=document.createElement("div");n.className="pen-tooltip",n.setAttribute("data-pen-ui",""),n.textContent=t,this.layer.appendChild(n);let o=e.getBoundingClientRect();n.style.left=`${window.scrollX+o.right+8}px`,n.style.top=`${window.scrollY+o.top}px`,this.tooltip=n}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user?(e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${m(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.renderAll()})):(e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers">
          <button class="pen-btn" data-act="github">GitHub</button>
          <button class="pen-btn" data-act="google">Google</button></div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn ghost" data-act="email">Email link</button></div>`,e.querySelector('[data-act="github"]').addEventListener("click",()=>location.href=this.api.loginUrl("github")),e.querySelector('[data-act="google"]').addEventListener("click",()=>location.href=this.api.loginUrl("google")),e.querySelector('[data-act="email"]').addEventListener("click",async()=>{let t=e.querySelector("input").value.trim();if(!t)return;let n=await this.api.emailLogin(t);n.link?location.href=n.link:alert("Check your email for a sign-in link.")})),document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},m=s=>String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),O=s=>{try{return new Date(s).toLocaleDateString()}catch{return""}};function C(){let s=window.PENUMBRA;if(!s?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new b(s);window.penumbra=e,e.init().catch(t=>console.error("[penumbra] init failed",t)),document.addEventListener("nav",()=>e.reload().catch(t=>console.error("[penumbra] reload failed",t)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",C):C();})();
//# sourceMappingURL=penumbra.js.map
