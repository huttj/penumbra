"use strict";(()=>{var C="penumbra:token",v=class{constructor(e){this.base=e}get token(){return localStorage.getItem(C)}set token(e){e?localStorage.setItem(C,e):localStorage.removeItem(C)}headers(e=!1){let t={};return e&&(t["Content-Type"]="application/json"),this.token&&(t.Authorization=`Bearer ${this.token}`),t}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let t=await e.json();return{user:t.user,isAuthor:!!t.isAuthor}}async list(e,t=[]){let n=new URLSearchParams({source:e});t.length&&n.set("include",t.join(","));let o=await fetch(`${this.base}/annotations?${n}`);return o.ok?(await o.json()).items:[]}async create(e,t,n={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:n.kind??"comment",body:[{type:"TextualBody",value:t}],docVersion:n.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:t})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,t){let n=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${n}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(t)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let t=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${t}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let t=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).response:null}async saveResponse(e,t,n,o){let r=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:t,quotes:n,sourceSha:o})});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error??`save failed (${r.status})`);return r.json()}async getAllResponses(e){let t=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return t.ok?(await t.json()).responses:[]}async submitResponse(e){let t=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),n=await t.json().catch(()=>({}));if(!t.ok)throw new Error(n.error??`submit failed (${t.status})`);return n}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function x(i){let e=document.createTreeWalker(i,NodeFilter.SHOW_TEXT,{acceptNode(r){let s=r.parentElement;return s&&s.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),t=[],n="",o;for(;o=e.nextNode();){let r=o,s=n.length;n+=r.data,t.push({node:r,start:s,end:n.length})}return{text:n,nodes:t}}function b(i,e){for(let n of i.nodes)if(e>=n.start&&e<=n.end)return{node:n.node,offset:e-n.start};let t=i.nodes[i.nodes.length-1];return t?{node:t.node,offset:t.node.data.length}:null}function H(i,e,t){if(e.nodeType===Node.TEXT_NODE){let r=i.nodes.find(s=>s.node===e);return r?r.start+t:null}let n=e.childNodes[t]??e.childNodes[e.childNodes.length-1];if(!n)return null;let o=i.nodes.find(r=>r.node===n||n.contains(r.node));return o?o.start:null}function w(i,e){let t=x(e),n=H(t,i.startContainer,i.startOffset),o=H(t,i.endContainer,i.endOffset);if(n==null||o==null||o<=n)return null;let r=t.text.slice(n,o),s=t.text.slice(Math.max(0,n-32),n),p=t.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:r,prefix:s,suffix:p},{type:"TextPositionSelector",start:n,end:o}]}function L(i,e){let t=x(e),n=i.find(d=>d.type==="TextQuoteSelector"),o=i.find(d=>d.type==="TextPositionSelector"),r=-1,s=-1;if(n&&n.exact){let d=q(t.text,n);d>=0&&(r=d,s=d+n.exact.length)}if(r<0&&o&&t.text.slice(o.start,o.end)&&(r=o.start,s=o.end),r<0)return null;let p=b(t,r),a=b(t,s);if(!p||!a)return null;let l=document.createRange();return l.setStart(p.node,p.offset),l.setEnd(a.node,a.offset),l}function m(i,e){let t=i.find(a=>a.type==="TextQuoteSelector");if(!t?.exact)return null;let n=x(e),o=q(n.text,t);if(o<0)return null;let r=b(n,o),s=b(n,o+t.exact.length);if(!r||!s)return null;let p=document.createRange();return p.setStart(r.node,r.offset),p.setEnd(s.node,s.offset),p}function M(i,e){let t=i.trim();if(t.length<8)return null;let n=x(e),o=n.text.indexOf(t);return o<0?null:[{type:"TextQuoteSelector",exact:t,prefix:n.text.slice(Math.max(0,o-32),o),suffix:n.text.slice(o+t.length,o+t.length+32)},{type:"TextPositionSelector",start:o,end:o+t.length}]}function q(i,e){let t=[],n=i.indexOf(e.exact);for(;n>=0;)t.push(n),n=i.indexOf(e.exact,n+1);if(t.length===0)return-1;if(t.length===1)return t[0];let o=t[0],r=-1;for(let s of t){let p=0;if(e.prefix){let a=i.slice(Math.max(0,s-e.prefix.length),s);p+=X(a,e.prefix)}if(e.suffix){let a=i.slice(s+e.exact.length,s+e.exact.length+e.suffix.length);p+=Y(a,e.suffix)}p>r&&(r=p,o=s)}return o}var Y=(i,e)=>{let t=0;for(;t<i.length&&t<e.length&&i[t]===e[t];)t++;return t},X=(i,e)=>{let t=0;for(;t<i.length&&t<e.length&&i[i.length-1-t]===e[e.length-1-t];)t++;return t};var P=i=>i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function N(i){let e=[],t=[];for(let n of(i??"").split(`
`))/^\s*>/.test(n)?t.push(n.replace(/^\s*>\s?/,"")):t.length&&(e.push(t.join(" ").trim()),t=[]);return t.length&&e.push(t.join(" ").trim()),e.filter(n=>n.length>=6)}function y(i){return P(i).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function S(i){let e=(i??"").replace(/\r\n/g,`
`).split(`
`),t=[],n=0;for(;n<e.length;){let o=e[n];if(/^```/.test(o)){let s=[];for(n++;n<e.length&&!/^```/.test(e[n]);)s.push(e[n++]);n++,t.push(`<pre><code>${P(s.join(`
`))}</code></pre>`);continue}if(/^\s*$/.test(o)){n++;continue}if(/^#{1,6}\s/.test(o)){let s=/^(#{1,6})\s+(.*)$/.exec(o);t.push(`<h${s[1].length}>${y(s[2])}</h${s[1].length}>`),n++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(o)){t.push("<hr>"),n++;continue}if(/^\s*>/.test(o)){let s=[];for(;n<e.length&&/^\s*>/.test(e[n]);)s.push(e[n++].replace(/^\s*>\s?/,""));t.push(`<blockquote>${S(s.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(o)){let s=[];for(;n<e.length&&/^\s*[-*+]\s/.test(e[n]);)s.push(`<li>${y(e[n++].replace(/^\s*[-*+]\s+/,""))}</li>`);t.push(`<ul>${s.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(o)){let s=[];for(;n<e.length&&/^\s*\d+\.\s/.test(e[n]);)s.push(`<li>${y(e[n++].replace(/^\s*\d+\.\s+/,""))}</li>`);t.push(`<ol>${s.join("")}</ol>`);continue}let r=[];for(;n<e.length&&!/^\s*$/.test(e[n])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[n]);)r.push(e[n++]);t.push(`<p>${y(r.join(" "))}</p>`)}return t.join(`
`)}var $=!!window.CSS?.highlights&&typeof globalThis.Highlight<"u",k=class{constructor(e){this.body="";this.mode="write";this.saveTimer=null;this.savedAt="";this.api=e.api,this.root=e.root,this.source=e.source,this.commitSha=e.commitSha,this.userName=e.userName,this.onClose=e.onClose}async open(){let e=await this.api.getResponse(this.source).catch(()=>null);e&&(this.body=e.body??"",this.savedAt=e.updated??""),this.build(),this.renderQuoteHighlights()}close(){if(this.flushSave(),$){let e=window.CSS.highlights;e.delete("penumbra-quote"),e.delete("penumbra-quote-active")}this.el?.remove(),I(),this.onClose()}build(){let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head">
        <strong>Your response</strong>
        <span class="pen-savestate" data-save></span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="mode" title="Toggle preview">Preview</button>
        <button class="pen-btn" data-act="submit" title="Commit this response to the author's repo">Submit</button>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button>
      </div>
      <textarea class="pen-essay" data-essay placeholder="Write your response. Select text in the page to quote it; paste a passage and Penumbra will try to anchor it to the source."></textarea>
      <div class="pen-preview" data-preview hidden></div>`,document.body.appendChild(e),this.el=e,Q(),this.ta=e.querySelector("[data-essay]"),this.ta.value=this.body,e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),e.querySelector('[data-act="mode"]').addEventListener("click",()=>this.toggleMode()),e.querySelector('[data-act="submit"]').addEventListener("click",()=>this.submit()),this.ta.addEventListener("input",()=>{this.body=this.ta.value,this.renderQuoteHighlights(),this.scheduleSave()}),this.ta.addEventListener("paste",()=>this.onPaste()),this.ta.addEventListener("keyup",()=>this.amplifyAtCursor()),this.ta.addEventListener("click",()=>this.amplifyAtCursor())}appendQuote(e){let n=w(e,this.root)?.find(o=>o.type==="TextQuoteSelector")?.exact??"";n&&(this.body=`${this.ta.value.replace(/\s+$/,"")}

> ${n.replace(/\n/g," ")}

`,this.ta.value=this.body,this.ta.selectionStart=this.ta.selectionEnd=this.ta.value.length,this.ta.focus(),this.renderQuoteHighlights(),this.scheduleSave())}onPaste(){setTimeout(()=>{this.body=this.ta.value,this.renderQuoteHighlights(),this.scheduleSave()},0)}extractQuotes(){let e=[],t=[];for(let n of this.ta.value.split(`
`))/^\s*>/.test(n)?t.push(n.replace(/^\s*>\s?/,"")):t.length&&(e.push(t.join(" ").trim()),t=[]);return t.length&&e.push(t.join(" ").trim()),e.filter(n=>n.length>=6)}rangeFor(e){return m([{type:"TextQuoteSelector",exact:e}],this.root)}renderQuoteHighlights(){if(!$)return;let e=this.extractQuotes().map(n=>this.rangeFor(n)).filter(Boolean),t=window.CSS.highlights;e.length?t.set("penumbra-quote",new globalThis.Highlight(...e)):t.delete("penumbra-quote")}amplifyAtCursor(){let e=this.ta.value.split(`
`),n=this.ta.value.slice(0,this.ta.selectionStart).split(`
`).length-1;for(;n>=0&&!/^\s*>/.test(e[n]??"");)n--;if(n<0)return this.amplify(null);let o=n,r=n;for(;o>0&&/^\s*>/.test(e[o-1]);)o--;for(;r<e.length-1&&/^\s*>/.test(e[r+1]);)r++;this.amplify(e.slice(o,r+1).map(s=>s.replace(/^\s*>\s?/,"")).join(" ").trim())}amplify(e){if(!$)return;let t=window.CSS.highlights,n=e&&e.length>=6?this.rangeFor(e):null;n?t.set("penumbra-quote-active",new globalThis.Highlight(n)):t.delete("penumbra-quote-active")}toggleMode(){this.mode=this.mode==="write"?"preview":"write";let e=this.el.querySelector("[data-preview]"),t=this.el.querySelector('[data-act="mode"]');this.mode==="preview"?(e.innerHTML=S(this.composeMarkdown()),e.querySelectorAll("blockquote").forEach(n=>{let o=(n.textContent??"").trim();n.addEventListener("mouseenter",()=>this.amplify(o)),n.addEventListener("mouseleave",()=>this.amplify(null))}),e.hidden=!1,this.ta.hidden=!0,t.textContent="Edit"):(e.hidden=!0,this.ta.hidden=!1,t.textContent="Preview")}composeMarkdown(){return this.body.trim()}scheduleSave(){this.setSave("saving\u2026"),clearTimeout(this.saveTimer),this.saveTimer=setTimeout(()=>this.flushSave(),800)}async flushSave(){clearTimeout(this.saveTimer);let e=this.extractQuotes().map((t,n)=>({id:`q${n}`,text:t,selector:M(t,this.root)??[{type:"TextQuoteSelector",exact:t}]}));try{let t=await this.api.saveResponse(this.source,this.body,e,this.commitSha);this.savedAt=t.updated??"",this.setSave("saved")}catch{this.setSave("save failed")}}setSave(e){let t=this.el?.querySelector("[data-save]");t&&(t.textContent=e)}async submit(){await this.flushSave(),this.setSave("submitting\u2026");try{let e=await this.api.submitResponse(this.source);this.setSave("submitted \u2713"),e.url&&window.open(e.url,"_blank")}catch(e){let t=String(e.message).includes("not configured");this.setSave(t?"submit not enabled yet":"submit failed"),alert(t?"Submitting to the repo isn't enabled yet \u2014 the author needs to add a GitHub token. Your draft is saved.":"Submit failed: "+e.message)}}},E=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let t=e.querySelector("[data-list]");t.innerHTML=this.reviews.length?this.reviews.map((n,o)=>{let r=(n.quotes??[]).filter(s=>!s.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${j(n.creator?.name??"reader")}</span>
              <span class="pen-savestate">${_(n.updated)} \xB7 ${n.status}</span></div>
            <div class="pen-md">${S(n.body||"_(quotes only \u2014 no writing yet)_")}</div>
            ${r.length?`<div class="pen-review-quotes">${r.map((s,p)=>`<a class="pen-qchip" data-ri="${o}" data-qi="${p}">\u201C${j(U(s.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),t.querySelectorAll(".pen-qchip").forEach(n=>n.addEventListener("click",()=>this.focusQuote(+n.dataset.ri,+n.dataset.qi))),document.body.appendChild(e),this.el=e,Q()}focusQuote(e,t){let n=this.reviews[e]?.quotes?.[t];if(!n)return;let o=m(n.selector,this.root);if(!o)return;let r=window.CSS?.highlights;r&&r.set("penumbra-quote-active",new globalThis.Highlight(o));let s=o.getBoundingClientRect();window.scrollTo({top:window.scrollY+s.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),I(),this.onClose()}};function j(i){return String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var _=i=>{try{return new Date(i).toLocaleDateString()}catch{return""}},U=(i,e=60)=>i.length>e?i.slice(0,e)+"\u2026":i;function Q(){document.body.classList.add("pen-panel-open")}function I(){document.body.classList.remove("pen-panel-open")}var R=`
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
/* bottom-left action group, across from the Reply button */
.pen-foot { display: flex; gap: 14px; align-items: center; }
.pen-foot a { font-size: 12px; color: var(--pen-muted); cursor: pointer; text-decoration: none; }
.pen-foot a:hover { text-decoration: underline; color: var(--pen-accent); }
.pen-foot a[data-act="delete"]:hover { color: var(--pen-unread); }

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
.pen-essay { flex: 1; border: none; resize: none; padding: 14px; outline: none;
  font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--pen-bg); color: var(--pen-fg); }
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
`;var O=typeof globalThis.Highlight<"u"&&!!R&&!!window.CSS?.highlights,A=10,V=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],T=class{constructor(e){this.user=null;this.isAuthor=!1;this.items=new Map;this.responseBody="";this.drafts=new Map;this.highlightsOn=!0;this.filter="all";this.focused=null;this.hovered=null;this.hoverRaf=!1;this.narrow=!1;this.draftSeq=0;this.relayoutQueued=!1;this.kindOf=e=>e["penumbra:kind"]??"comment";this.acknowledged=e=>!!e["penumbra:acknowledged"];this.repliesOf=e=>e["penumbra:replies"]??[];this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cfg=e,this.api=new v(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.docVersion=e.docVersion}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){let e=document.createElement("style");e.textContent=R,document.head.appendChild(e),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let t=await this.api.me();this.user=t.user,this.isAuthor=t.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadAnnotations(),document.addEventListener("mouseup",n=>{n.target.closest("[data-pen-ui]")||setTimeout(()=>this.onSelection(),0)}),document.addEventListener("mousedown",n=>this.onDocMouseDown(n)),document.addEventListener("click",n=>this.onDocClick(n)),document.addEventListener("mousemove",n=>this.onMouseMove(n),{passive:!0}),document.addEventListener("keydown",n=>{n.key==="Escape"&&(this.compose?this.dismissCompose(!1):this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.drafts.clear(),this.focused=null,this.hovered=null,this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadAnnotations()}async loadAnnotations(){let e=await this.api.list(this.source);this.items.clear();for(let t of e)this.items.set(t.id,{anno:t,range:L(t.target.selector,this.root)});this.renderAll(),this.loadResponseHighlights()}async loadResponseHighlights(){if(!this.user||this.responsePanel)return;let e=await this.api.getResponse(this.source).catch(()=>null);this.responseBody=e?.body??"",this.renderResponseHighlights()}renderResponseHighlights(){if(!O||this.responsePanel)return;let e=N(this.responseBody).map(n=>m([{type:"TextQuoteSelector",exact:n}],this.root)).filter(Boolean),t=window.CSS.highlights;e.length?t.set("penumbra-quote",new globalThis.Highlight(...e)):t.delete("penumbra-quote")}comments(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="comment")}emojis(){return[...this.items.values()].filter(e=>this.kindOf(e.anno)==="emoji")}passesFilter(e){switch(this.filter){case"unread":return!this.acknowledged(e);case"mine":{let t=this.user?.id;return!!t&&(e.creator?.id===t||this.repliesOf(e).some(n=>n.creator?.id===t))}case"author":return e.creator?.authored||this.repliesOf(e).some(t=>t.creator?.authored);default:return!0}}visibleComments(){return this.comments().filter(e=>e.range&&this.passesFilter(e.anno)).sort((e,t)=>this.docY(e.range)-this.docY(t.range))}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail(),this.updateToolbar()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!O)return;let e=window.CSS.highlights,t=globalThis.Highlight;if(!this.highlightsOn){e.delete("penumbra"),e.delete("penumbra-active"),e.delete("penumbra-draft");return}let n=this.visibleComments().map(a=>a.range).concat(this.emojis().filter(a=>a.range&&this.passesFilter(a.anno)).map(a=>a.range));e.set("penumbra",new t(...n));let o=[...this.drafts.values()].map(a=>a.range);this.composeCtx?.range&&o.push(this.composeCtx.range);let r=o.filter(Boolean);r.length?e.set("penumbra-draft",new t(...r)):e.delete("penumbra-draft");let s=this.hovered??this.focused,p=s&&this.items.get(s)?.range;p?e.set("penumbra-active",new t(p)):e.delete("penumbra-active")}layoutRightRail(){if(this.layer.querySelectorAll(".pen-card.rail").forEach(l=>l.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect();if(this.narrow=window.innerWidth-e.right<320,this.narrow)return;let t=this.visibleComments();if(!t.length)return;let n=window.scrollX+e.right+24,o=t.map(l=>{let d=this.buildCommentCard(l,this.focused===l.anno.id,"rail");return d.style.left=`${n}px`,d.style.top="-9999px",this.layer.appendChild(d),d}),r=o.map(l=>l.offsetHeight),s=t.map(l=>this.docY(l.range)),p=s.slice(),a=t.findIndex(l=>l.anno.id===this.focused);if(a>=0){p[a]=s[a];for(let l=a+1;l<t.length;l++)p[l]=Math.max(s[l],p[l-1]+r[l-1]+A);for(let l=a-1;l>=0;l--)p[l]=Math.min(s[l],p[l+1]-r[l]-A)}else for(let l=1;l<t.length;l++)p[l]=Math.max(s[l],p[l-1]+r[l-1]+A);o.forEach((l,d)=>l.style.top=`${Math.max(0,p[d])}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote").forEach(o=>o.remove()),!this.highlightsOn)return;let e=this.root.getBoundingClientRect(),t=window.scrollX+Math.max(6,e.left-40),n=0;for(let o of this.emojis().filter(r=>r.range&&this.passesFilter(r.anno)).sort((r,s)=>this.docY(r.range)-this.docY(s.range))){let r=o.anno,s=document.createElement("div");s.className="pen-emote",s.setAttribute("data-pen-ui",""),s.textContent=r.body?.[0]?.value??"\u2B50",s.dataset.annoId=r.id;let p=`${r.creator?.name??"someone"} reacted`;s.addEventListener("mouseenter",()=>{this.setHovered(r.id),this.showTooltip(s,p)}),s.addEventListener("mouseleave",()=>{this.setHovered(null),this.hideTooltip()}),this.layer.appendChild(s);let a=Math.max(this.docY(o.range),n+6);s.style.left=`${t}px`,s.style.top=`${a}px`,n=a+s.offsetHeight}}buildCommentCard(e,t,n){let o=e.anno,r=o.id,s=document.createElement("div");s.className=`pen-card ${n} ${t?"focused":"compact"}`,s.setAttribute("data-pen-ui",""),s.dataset.annoId=r;let p=o.target.selector.find(c=>c.type==="TextQuoteSelector")?.exact??"",a=this.repliesOf(o),l=this.isAuthor&&!this.acknowledged(o)&&!o.creator?.authored,d=(c,h)=>{let u=c.creator?.avatar?`<img src="${f(c.creator.avatar)}" alt="">`:"",B=c.creator?.authored?'<span class="pen-badge">author</span>':"",F=h&&l?'<span class="pen-unread-dot" title="unread"></span>':"",D=h?o.body?.[0]?.value??"":c.body;return`<div class="pen-comment">
        <div class="pen-meta">${F}${u}<span class="pen-name">${f(c.creator?.name??"anon")}</span>${B}
          <span>\xB7 ${W(h?o.created:c.created)}</span></div>
        <div class="pen-body">${f(D)}</div></div>`},g=`<div class="pen-quote">${f(p)}</div><div class="pen-thread">`;if(g+=d({creator:o.creator,created:o.created},!0),!t)a.length&&(g+=`<div class="pen-more">${a.length} repl${a.length===1?"y":"ies"} \u2192</div>`);else for(let c of a)g+=d(c,!1);if(g+="</div>",t){let c=this.user&&o.creator?.id===this.user.id,h=[];this.isAuthor&&!o.creator?.authored&&h.push(`<a data-act="ack">${this.acknowledged(o)?"Mark unread":"Acknowledge"}</a>`),c&&h.push('<a data-act="delete">Delete</a>');let u=`<span class="pen-foot">${h.join("")}</span>`;this.user?g+=`<div class="pen-reply"><textarea placeholder="Reply\u2026"></textarea>
          <div class="pen-row">${u}<button class="pen-btn" data-act="send-reply">Reply</button></div></div>`:g+=`<div class="pen-reply"><div class="pen-row">${u}<a class="pen-btn ghost" data-act="login" style="text-decoration:none">Sign in to reply</a></div></div>`}if(s.innerHTML=g,s.addEventListener("mouseenter",()=>this.setHovered(r)),s.addEventListener("mouseleave",()=>this.setHovered(null)),!t)s.addEventListener("click",()=>this.focus(r));else{s.querySelector('[data-act="ack"]')?.addEventListener("click",()=>this.toggleAck(r)),s.querySelector('[data-act="delete"]')?.addEventListener("click",()=>this.remove(r)),s.querySelector('[data-act="login"]')?.addEventListener("click",()=>this.flashLogin());let c=s.querySelector("textarea"),h=()=>{c?.value.trim()&&this.sendReply(r,c.value.trim())};s.querySelector('[data-act="send-reply"]')?.addEventListener("click",h),c?.addEventListener("keydown",u=>{(u.metaKey||u.ctrlKey)&&u.key==="Enter"&&(u.preventDefault(),h())})}return s}focus(e,t=!1){this.focused=e;let n=this.items.get(e);t&&n?.range&&window.scrollTo({top:this.docY(n.range)-120,behavior:"smooth"}),this.narrow?this.openFloatingCard(e):this.renderAll(),this.renderHighlights()}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-anno-id]").forEach(t=>t.classList.toggle("pen-emph",t.dataset.annoId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let t=null;for(let n of this.comments())if(n.range&&this.hitsRange(e,n.range)){t=n.anno.id;break}if(!t){for(let n of this.emojis())if(n.range&&this.hitsRange(e,n.range)){t=n.anno.id;break}}this.setHovered(t)}))}nav(e){let t=this.visibleComments();if(!t.length)return;let n=t.findIndex(o=>o.anno.id===this.focused);n=n<0?e>0?0:t.length-1:(n+e+t.length)%t.length,this.focus(t[n].anno.id,!0)}openFloatingCard(e){this.dismissCompose(),this.layer.querySelectorAll(".pen-card.floating").forEach(p=>p.remove());let t=this.items.get(e);if(!t)return;let n=this.buildCommentCard(t,!0,"floating"),o=t.range?.getBoundingClientRect(),r=o?window.scrollY+o.bottom+8:window.scrollY+80,s=Math.min(window.scrollX+(o?.left??40),window.scrollX+window.innerWidth-310);n.style.top=`${r}px`,n.style.left=`${Math.max(8,s)}px`,this.layer.appendChild(n)}async sendReply(e,t){try{await this.api.reply(e,t)}catch(n){alert(n.message);return}await this.loadAnnotations(),this.focus(e)}async toggleAck(e){let t=this.items.get(e)?.anno;t&&(await this.api.patch(e,{acknowledged:!this.acknowledged(t)}).catch(n=>alert(n.message)),await this.loadAnnotations(),this.focus(e))}async remove(e){confirm("Delete this comment thread?")&&(await this.api.remove(e),this.items.delete(e),this.focused=null,this.renderAll())}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let t=e.getRangeAt(0);if(this.root.contains(t.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(t.cloneRange());return}this.openCompose(t.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let t=e.getBoundingClientRect(),n=document.createElement("button");n.className="pen-addbtn",n.setAttribute("data-pen-ui",""),n.textContent="Quote",n.style.left=`${window.scrollX+t.left+t.width/2}px`,n.style.top=`${window.scrollY+t.top}px`,n.onmousedown=o=>{o.preventDefault(),o.stopPropagation()},n.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(n),this.quoteBtn=n}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}dismissCompose(e=!1){let t=this.composeCtx;if(this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,t){let n=t.ta.value.trim();e&&n?this.drafts.set(t.draftId??`draft-${++this.draftSeq}`,{selectors:t.selectors,range:t.range,text:n}):t.draftId&&this.drafts.delete(t.draftId)}this.renderHighlights()}openCompose(e,t){if(!this.user)return this.promptSignIn(e);let n=t?.draftId?this.drafts.get(t.draftId)?.selectors:w(e,this.root);if(!n)return;this.dismissCompose();let o=e.getBoundingClientRect(),r=document.createElement("div");r.className="pen-compose",r.setAttribute("data-pen-ui",""),r.style.left=`${Math.min(window.scrollX+o.left,window.scrollX+window.innerWidth-372)}px`,r.style.top=`${window.scrollY+o.bottom+8}px`,r.innerHTML=`<textarea placeholder="Comment\u2026  (\u2318/Ctrl + \u23CE to send)"></textarea>
      <div class="pen-composebar">
        <div class="pen-emojibar">${V.map(a=>`<button data-emoji="${a}">${a}</button>`).join("")}</div>
        <button class="pen-btn" data-act="post">Comment</button></div>`;let s=r.querySelector("textarea");t?.text&&(s.value=t.text);let p=()=>{s.value.trim()&&this.create(n,s.value.trim(),"comment")};s.addEventListener("keydown",a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),p())}),r.querySelectorAll("[data-emoji]").forEach(a=>a.addEventListener("click",()=>this.create(n,a.dataset.emoji,"emoji"))),r.querySelector('[data-act="post"]').addEventListener("click",p),this.layer.appendChild(r),this.compose=r,this.composeCtx={selectors:n,range:e,ta:s,draftId:t?.draftId??null},this.renderHighlights(),s.focus()}promptSignIn(e){this.dismissCompose();let t=e.getBoundingClientRect(),n=document.createElement("div");n.className="pen-compose",n.setAttribute("data-pen-ui",""),n.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-372)}px`,n.style.top=`${window.scrollY+t.bottom+8}px`,n.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,n.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.layer.appendChild(n),this.compose=n}reopenDraft(e){let t=this.drafts.get(e);t?.range&&this.openCompose(t.range,{draftId:e,text:t.text})}async create(e,t,n){let o=this.composeCtx?.draftId;try{let r=await this.api.create({source:this.source,selector:e},t,{kind:n,docVersion:this.docVersion});this.items.set(r.id,{anno:r,range:L(r.target.selector,this.root)}),o&&this.drafts.delete(o),this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,window.getSelection()?.removeAllRanges(),n==="comment"&&(this.focused=r.id),this.renderAll()}catch(r){alert("Could not save: "+r.message)}}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(!0),this.removeQuoteBtn(),this.layer.querySelectorAll(".pen-card.floating").forEach(t=>t.remove()))}onDocClick(e){if(!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let[t,n]of this.drafts)if(n.range&&this.hitsRange(e,n.range))return this.reopenDraft(t);for(let t of this.comments())if(t.range&&this.hitsRange(e,t.range))return this.focus(t.anno.id);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,t){for(let n of t.getClientRects())if(e.clientX>=n.left&&e.clientX<=n.right&&e.clientY>=n.top&&e.clientY<=n.bottom)return!0;return!1}renderToolbar(){let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn" data-act="toggle" title="Show/hide highlights">\u2726 <span data-label>Highlights</span></button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="toggle"]').classList.add("active"),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new E({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active"),this.responsePanel=new k({api:this.api,root:this.root,source:this.source,commitSha:this.cfg.commitSha??null,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.renderHighlights(),this.loadResponseHighlights()}}),this.responsePanel.open()}updateToolbar(){}showTooltip(e,t){this.hideTooltip();let n=document.createElement("div");n.className="pen-tooltip",n.setAttribute("data-pen-ui",""),n.textContent=t,this.layer.appendChild(n);let o=e.getBoundingClientRect();n.style.left=`${window.scrollX+o.right+8}px`,n.style.top=`${window.scrollY+o.top}px`,this.tooltip=n}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${f(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.renderAll()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let t=async()=>{let n=e.querySelector("input"),o=n.value.trim();if(!o)return;let r=await this.api.emailLogin(o);r.link?location.href=r.link:(n.value="",n.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",t),e.querySelector("input").addEventListener("keydown",n=>{n.key==="Enter"&&t()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},f=i=>String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]),W=i=>{try{return new Date(i).toLocaleDateString()}catch{return""}};function z(){let i=window.PENUMBRA;if(!i?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new T(i);window.penumbra=e,e.init().catch(t=>console.error("[penumbra] init failed",t)),document.addEventListener("nav",()=>e.reload().catch(t=>console.error("[penumbra] reload failed",t)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",z):z();})();
//# sourceMappingURL=penumbra.js.map
