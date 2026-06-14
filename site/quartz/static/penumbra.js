"use strict";(()=>{var w="penumbra:token",u=class{constructor(e){this.base=e}get token(){return localStorage.getItem(w)}set token(e){e?localStorage.setItem(w,e):localStorage.removeItem(w)}headers(e=!1){let n={};return e&&(n["Content-Type"]="application/json"),this.token&&(n.Authorization=`Bearer ${this.token}`),n}captureTokenFromHash(){let e=/[#&]pen_token=([^&]+)/.exec(location.hash);return e?(this.token=decodeURIComponent(e[1]),history.replaceState(null,"",location.pathname+location.search),!0):!1}async me(){if(!this.token)return{user:null,isAuthor:!1};let e=await fetch(`${this.base}/me`,{headers:this.headers()});if(!e.ok)return{user:null,isAuthor:!1};let n=await e.json();return{user:n.user,isAuthor:!!n.isAuthor}}async list(e,n=[]){let t=new URLSearchParams({source:e});n.length&&t.set("include",n.join(","));let o=await fetch(`${this.base}/annotations?${t}`);return o.ok?(await o.json()).items:[]}async create(e,n,t={}){let o=await fetch(`${this.base}/annotations`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({target:e,kind:t.kind??"comment",body:[{type:"TextualBody",value:n}],docVersion:t.docVersion})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`create failed (${o.status})`);return o.json()}async reply(e,n){let t=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${t}/replies`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({text:n})});if(!o.ok)throw new Error((await o.json().catch(()=>({}))).error??`reply failed (${o.status})`);return o.json()}async patch(e,n){let t=e.split("/annotations/")[1],o=await fetch(`${this.base}/annotations/${t}`,{method:"PATCH",headers:this.headers(!0),body:JSON.stringify(n)});if(!o.ok)throw new Error(`patch failed (${o.status})`);return o.json()}async remove(e){let n=e.split("/annotations/")[1];await fetch(`${this.base}/annotations/${n}`,{method:"DELETE",headers:this.headers()})}async getResponse(e){let n=await fetch(`${this.base}/responses?source=${encodeURIComponent(e)}`,{headers:this.headers()});return n.ok?(await n.json()).response:null}async saveResponse(e,n,t,o){let s=await fetch(`${this.base}/responses`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e,body:n,quotes:t,sourceSha:o})});if(!s.ok)throw new Error((await s.json().catch(()=>({}))).error??`save failed (${s.status})`);return s.json()}async getAllResponses(e){let n=await fetch(`${this.base}/responses/all?source=${encodeURIComponent(e)}`,{headers:this.headers()});return n.ok?(await n.json()).responses:[]}async submitResponse(e){let n=await fetch(`${this.base}/responses/submit`,{method:"POST",headers:this.headers(!0),body:JSON.stringify({source:e})}),t=await n.json().catch(()=>({}));if(!n.ok)throw new Error(t.error??`submit failed (${n.status})`);return t}loginUrl(e){return`${this.base}/auth/${e}/start?return=${encodeURIComponent(location.href)}`}async emailLogin(e){return(await fetch(`${this.base}/auth/email/start`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,return:location.href})})).json()}async logout(){await fetch(`${this.base}/auth/logout`,{method:"POST",headers:this.headers()}).catch(()=>{}),this.token=null}};function y(i){let e=document.createTreeWalker(i,NodeFilter.SHOW_TEXT,{acceptNode(s){let r=s.parentElement;return r&&r.closest("[data-pen-ui]")?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),n=[],t="",o;for(;o=e.nextNode();){let s=o,r=t.length;t+=s.data,n.push({node:s,start:r,end:t.length})}return{text:t,nodes:n}}function C(i,e){for(let t of i.nodes)if(e>=t.start&&e<=t.end)return{node:t.node,offset:e-t.start};let n=i.nodes[i.nodes.length-1];return n?{node:n.node,offset:n.node.data.length}:null}function q(i,e,n){if(e.nodeType===Node.TEXT_NODE){let s=i.nodes.find(r=>r.node===e);return s?s.start+n:null}let t=e.childNodes[n]??e.childNodes[e.childNodes.length-1];if(!t)return null;let o=i.nodes.find(s=>s.node===t||t.contains(s.node));return o?o.start:null}function g(i,e){let n=y(e),t=q(n,i.startContainer,i.startOffset),o=q(n,i.endContainer,i.endOffset);if(t==null||o==null||o<=t)return null;let s=n.text.slice(t,o),r=n.text.slice(Math.max(0,t-32),t),a=n.text.slice(o,o+32);return[{type:"TextQuoteSelector",exact:s,prefix:r,suffix:a},{type:"TextPositionSelector",start:t,end:o}]}function h(i,e){let n=i.find(p=>p.type==="TextQuoteSelector");if(!n?.exact)return null;let t=y(e),o=z(t.text,n);if(o<0)return null;let s=C(t,o),r=C(t,o+n.exact.length);if(!s||!r)return null;let a=document.createRange();return a.setStart(s.node,s.offset),a.setEnd(r.node,r.offset),a}function m(i,e){let n=i.trim();if(n.length<8)return null;let t=y(e),o=t.text.indexOf(n);return o<0?null:[{type:"TextQuoteSelector",exact:n,prefix:t.text.slice(Math.max(0,o-32),o),suffix:t.text.slice(o+n.length,o+n.length+32)},{type:"TextPositionSelector",start:o,end:o+n.length}]}function z(i,e){let n=[],t=i.indexOf(e.exact);for(;t>=0;)n.push(t),t=i.indexOf(e.exact,t+1);if(n.length===0)return-1;if(n.length===1)return n[0];let o=n[0],s=-1;for(let r of n){let a=0;if(e.prefix){let p=i.slice(Math.max(0,r-e.prefix.length),r);a+=F(p,e.prefix)}if(e.suffix){let p=i.slice(r+e.exact.length,r+e.exact.length+e.suffix.length);a+=O(p,e.suffix)}a>s&&(s=a,o=r)}return o}var O=(i,e)=>{let n=0;for(;n<i.length&&n<e.length&&i[n]===e[n];)n++;return n},F=(i,e)=>{let n=0;for(;n<i.length&&n<e.length&&i[i.length-1-n]===e[e.length-1-n];)n++;return n};var R=i=>i.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function $(i){let e=[],n=[];for(let t of(i??"").split(`
`))/^\s*>/.test(t)?n.push(t.replace(/^\s*>\s?/,"")):n.length&&(e.push(n.join(" ").trim()),n=[]);return n.length&&e.push(n.join(" ").trim()),e.filter(t=>t.length>=6)}var S=i=>/^\s*>/.test(i??"");function H(i){let e=(i??"").replace(/\r\n/g,`
`).split(`
`),n=0,t=[];for(;n<e.length&&!S(e[n]);)t.push(e[n]),n++;let o=[];for(;n<e.length;){let s=[];for(;n<e.length&&S(e[n]);)s.push(e[n].replace(/^\s*>\s?/,"")),n++;let r=[];for(;n<e.length&&!S(e[n]);)r.push(e[n]),n++;o.push({quotes:[s.join(" ").trim()],note:r.join(`
`).trim()})}return{preamble:t.join(`
`).trim(),blocks:o}}function M(i,e){let n=[];i.trim()&&n.push(i.trim());for(let t of e){if(!t.quotes.length&&!t.note.trim())continue;let o=t.quotes.map(s=>`> ${s.replace(/\n/g," ")}`).join(`
>
`);n.push(t.note.trim()?`${o}

${t.note.trim()}`:o)}return n.join(`

`)+`
`}function k(i){let e=i.trim();return e?e.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}️‍\s]/gu,"")===""&&/\p{Extended_Pictographic}/u.test(e):!1}function f(i){return R(i).replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g,"$1<em>$2</em>")}function d(i){let e=(i??"").replace(/\r\n/g,`
`).split(`
`),n=[],t=0;for(;t<e.length;){let o=e[t];if(/^```/.test(o)){let r=[];for(t++;t<e.length&&!/^```/.test(e[t]);)r.push(e[t++]);t++,n.push(`<pre><code>${R(r.join(`
`))}</code></pre>`);continue}if(/^\s*$/.test(o)){t++;continue}if(/^#{1,6}\s/.test(o)){let r=/^(#{1,6})\s+(.*)$/.exec(o);n.push(`<h${r[1].length}>${f(r[2])}</h${r[1].length}>`),t++;continue}if(/^\s*([-*_])\1{2,}\s*$/.test(o)){n.push("<hr>"),t++;continue}if(/^\s*>/.test(o)){let r=[];for(;t<e.length&&/^\s*>/.test(e[t]);)r.push(e[t++].replace(/^\s*>\s?/,""));n.push(`<blockquote>${d(r.join(`
`))}</blockquote>`);continue}if(/^\s*[-*+]\s/.test(o)){let r=[];for(;t<e.length&&/^\s*[-*+]\s/.test(e[t]);)r.push(`<li>${f(e[t++].replace(/^\s*[-*+]\s+/,""))}</li>`);n.push(`<ul>${r.join("")}</ul>`);continue}if(/^\s*\d+\.\s/.test(o)){let r=[];for(;t<e.length&&/^\s*\d+\.\s/.test(e[t]);)r.push(`<li>${f(e[t++].replace(/^\s*\d+\.\s+/,""))}</li>`);n.push(`<ol>${r.join("")}</ol>`);continue}let s=[];for(;t<e.length&&!/^\s*$/.test(e[t])&&!/^(#{1,6}\s|```|\s*>|\s*[-*+]\s|\s*\d+\.\s)/.test(e[t]);)s.push(e[t++]);n.push(`<p>${f(s.join(" "))}</p>`)}return n.join(`
`)}var E=!!window.CSS?.highlights&&typeof globalThis.Highlight<"u",v=class{constructor(e){this.body="";this.mode="write";this.saveTimer=null;this.savedAt="";this.hoverRaf=!1;this.onSourceHover=e=>{this.hoverRaf||this.mode!=="write"||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,!e.target?.closest?.("[data-pen-ui]"))for(let n of this.extractQuotes()){let t=this.rangeFor(n);if(t&&[...t.getClientRects()].some(o=>e.clientX>=o.left&&e.clientX<=o.right&&e.clientY>=o.top&&e.clientY<=o.bottom)){this.amplify(n),document.activeElement!==this.ta&&this.selectBlockquote(n);return}}}))};this.api=e.api,this.root=e.root,this.source=e.source,this.commitSha=e.commitSha,this.userName=e.userName,this.onClose=e.onClose}async open(){let e=await this.api.getResponse(this.source).catch(()=>null);e&&(this.body=e.body??"",this.savedAt=e.updated??""),this.build(),this.renderQuoteHighlights()}close(){if(document.removeEventListener("mousemove",this.onSourceHover),this.flushSave(),E){let e=window.CSS.highlights;e.delete("penumbra-quote"),e.delete("penumbra-quote-active")}this.el?.remove(),j(),this.onClose()}build(){let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head">
        <strong>Your response</strong>
        <span class="pen-savestate" data-save></span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="mode" title="Toggle preview">Preview</button>
        <button class="pen-btn" data-act="submit" title="Commit this response to the author's repo">Submit</button>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button>
      </div>
      <textarea class="pen-essay" data-essay placeholder="Write your response. Select text in the page to quote it; paste a passage and Penumbra will try to anchor it to the source."></textarea>
      <div class="pen-preview" data-preview hidden></div>`,document.body.appendChild(e),this.el=e,P(),this.ta=e.querySelector("[data-essay]"),this.ta.value=this.body,e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),e.querySelector('[data-act="mode"]').addEventListener("click",()=>this.toggleMode()),e.querySelector('[data-act="submit"]').addEventListener("click",()=>this.submit()),this.ta.addEventListener("input",()=>{this.body=this.ta.value,this.renderQuoteHighlights(),this.scheduleSave()}),this.ta.addEventListener("paste",()=>this.onPaste()),this.ta.addEventListener("keyup",()=>this.amplifyAtCursor()),this.ta.addEventListener("click",()=>this.amplifyAtCursor()),document.addEventListener("mousemove",this.onSourceHover,{passive:!0})}selectBlockquote(e){let n=this.ta.value.split(`
`);for(let t=0;t<n.length;t++){if(!/^\s*>/.test(n[t]))continue;let o=t;for(;o<n.length-1&&/^\s*>/.test(n[o+1]);)o++;if(n.slice(t,o+1).map(r=>r.replace(/^\s*>\s?/,"")).join(" ").trim()===e){this.ta.selectionStart=n.slice(0,t).join(`
`).length+(t>0?1:0),this.ta.selectionEnd=n.slice(0,o+1).join(`
`).length;let r=parseFloat(getComputedStyle(this.ta).lineHeight)||22;this.ta.scrollTop=Math.max(0,t*r-this.ta.clientHeight/2);return}t=o}}appendQuote(e){let t=g(e,this.root)?.find(o=>o.type==="TextQuoteSelector")?.exact??"";t&&(this.body=`${this.ta.value.replace(/\s+$/,"")}

> ${t.replace(/\n/g," ")}

`,this.ta.value=this.body,this.ta.selectionStart=this.ta.selectionEnd=this.ta.value.length,this.ta.focus(),this.renderQuoteHighlights(),this.scheduleSave())}onPaste(){setTimeout(()=>{this.body=this.ta.value,this.renderQuoteHighlights(),this.scheduleSave()},0)}extractQuotes(){let e=[],n=[];for(let t of this.ta.value.split(`
`))/^\s*>/.test(t)?n.push(t.replace(/^\s*>\s?/,"")):n.length&&(e.push(n.join(" ").trim()),n=[]);return n.length&&e.push(n.join(" ").trim()),e.filter(t=>t.length>=6)}rangeFor(e){return h([{type:"TextQuoteSelector",exact:e}],this.root)}renderQuoteHighlights(){if(!E)return;let e=this.extractQuotes().map(t=>this.rangeFor(t)).filter(Boolean),n=window.CSS.highlights;e.length?n.set("penumbra-quote",new globalThis.Highlight(...e)):n.delete("penumbra-quote")}amplifyAtCursor(){let e=this.ta.value.split(`
`),t=this.ta.value.slice(0,this.ta.selectionStart).split(`
`).length-1;for(;t>=0&&!/^\s*>/.test(e[t]??"");)t--;if(t<0)return this.amplify(null);let o=t,s=t;for(;o>0&&/^\s*>/.test(e[o-1]);)o--;for(;s<e.length-1&&/^\s*>/.test(e[s+1]);)s++;this.amplify(e.slice(o,s+1).map(r=>r.replace(/^\s*>\s?/,"")).join(" ").trim())}amplify(e){if(!E)return;let n=window.CSS.highlights,t=e&&e.length>=6?this.rangeFor(e):null;t?n.set("penumbra-quote-active",new globalThis.Highlight(t)):n.delete("penumbra-quote-active")}toggleMode(){this.mode=this.mode==="write"?"preview":"write";let e=this.el.querySelector("[data-preview]"),n=this.el.querySelector('[data-act="mode"]');this.mode==="preview"?(e.innerHTML=d(this.composeMarkdown()),e.querySelectorAll("blockquote").forEach(t=>{let o=(t.textContent??"").trim();t.addEventListener("mouseenter",()=>this.amplify(o)),t.addEventListener("mouseleave",()=>this.amplify(null))}),e.hidden=!1,this.ta.hidden=!0,n.textContent="Edit"):(e.hidden=!0,this.ta.hidden=!1,n.textContent="Preview")}composeMarkdown(){return this.body.trim()}scheduleSave(){this.setSave("saving\u2026"),clearTimeout(this.saveTimer),this.saveTimer=setTimeout(()=>this.flushSave(),800)}async flushSave(){clearTimeout(this.saveTimer);let e=this.extractQuotes().map((n,t)=>({id:`q${t}`,text:n,selector:m(n,this.root)??[{type:"TextQuoteSelector",exact:n}]}));try{let n=await this.api.saveResponse(this.source,this.body,e,this.commitSha);this.savedAt=n.updated??"",this.setSave("saved")}catch{this.setSave("save failed")}}setSave(e){let n=this.el?.querySelector("[data-save]");n&&(n.textContent=e)}async submit(){await this.flushSave(),this.setSave("submitting\u2026");try{let e=await this.api.submitResponse(this.source);this.setSave("submitted \u2713"),e.url&&window.open(e.url,"_blank")}catch(e){let n=String(e.message).includes("not configured");this.setSave(n?"submit not enabled yet":"submit failed"),alert(n?"Submitting to the repo isn't enabled yet \u2014 the author needs to add a GitHub token. Your draft is saved.":"Submit failed: "+e.message)}}},b=class{constructor(e){this.reviews=[];this.api=e.api,this.root=e.root,this.source=e.source,this.onClose=e.onClose}async open(){this.reviews=await this.api.getAllResponses(this.source).catch(()=>[]);let e=document.createElement("div");e.className="pen-panel",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <div class="pen-panel-head"><strong>Reviews</strong>
        <span class="pen-savestate">${this.reviews.length}</span>
        <span style="flex:1"></span>
        <button class="pen-tbtn" data-act="close" title="Close">\u2715</button></div>
      <div class="pen-reviews" data-list></div>`;let n=e.querySelector("[data-list]");n.innerHTML=this.reviews.length?this.reviews.map((t,o)=>{let s=(t.quotes??[]).filter(r=>!r.dismissed);return`<div class="pen-review">
            <div class="pen-review-head"><span class="pen-name">${A(t.creator?.name??"reader")}</span>
              <span class="pen-savestate">${I(t.updated)} \xB7 ${t.status}</span></div>
            <div class="pen-md">${d(t.body||"_(quotes only \u2014 no writing yet)_")}</div>
            ${s.length?`<div class="pen-review-quotes">${s.map((r,a)=>`<a class="pen-qchip" data-ri="${o}" data-qi="${a}">\u201C${A(D(r.text))}\u201D</a>`).join("")}</div>`:""}
          </div>`}).join(""):'<p style="padding:14px;color:var(--pen-muted)">No reviews yet.</p>',e.querySelector('[data-act="close"]').addEventListener("click",()=>this.close()),n.querySelectorAll(".pen-qchip").forEach(t=>t.addEventListener("click",()=>this.focusQuote(+t.dataset.ri,+t.dataset.qi))),document.body.appendChild(e),this.el=e,P()}focusQuote(e,n){let t=this.reviews[e]?.quotes?.[n];if(!t)return;let o=h(t.selector,this.root);if(!o)return;let s=window.CSS?.highlights;s&&s.set("penumbra-quote-active",new globalThis.Highlight(o));let r=o.getBoundingClientRect();window.scrollTo({top:window.scrollY+r.top-120,behavior:"smooth"})}close(){let e=window.CSS?.highlights;e&&e.delete("penumbra-quote-active"),this.el?.remove(),j(),this.onClose()}};function A(i){return String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}var I=i=>{try{return new Date(i).toLocaleDateString()}catch{return""}},D=(i,e=60)=>i.length>e?i.slice(0,e)+"\u2026":i;function P(){document.body.classList.add("pen-panel-open")}function j(){document.body.classList.remove("pen-panel-open")}var N=`
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
`;var Y=typeof globalThis.Highlight<"u"&&!!window.CSS?.highlights,T=10,X=["\u{1F44D}","\u2764\uFE0F","\u{1F525}","\u{1F604}","\u{1F914}","\u{1F3AF}"],x=class{constructor(e){this.user=null;this.isAuthor=!1;this.preamble="";this.blocks=[];this.highlightsOn=!0;this.focused=null;this.hovered=null;this.hoverRaf=!1;this.relayoutQueued=!1;this.blockById=e=>this.blocks.find(n=>n.id===e);this.docY=e=>e.getBoundingClientRect().top+window.scrollY;this.cards=()=>this.blocks.filter(e=>!e.isEmoji&&e.ranges.length);this.chips=()=>this.blocks.filter(e=>e.isEmoji&&e.ranges.length);this.cfg=e,this.api=new u(e.api),this.root=this.resolveRoot(),this.source=this.computeSource(),this.commitSha=e.commitSha??null}resolveRoot(){return(this.cfg.root?document.querySelector(this.cfg.root):null)??document.body}computeSource(){if(this.cfg.source)return this.cfg.source;if(this.cfg.sourceBase){let e=location.pathname.replace(/\/index\.html?$/i,"/").replace(/\.html?$/i,"").replace(/\/$/,"");return this.cfg.sourceBase.replace(/\/$/,"")+e}return location.href}async init(){let e=document.createElement("style");e.textContent=N,document.head.appendChild(e),this.layer=document.createElement("div"),this.layer.setAttribute("data-pen-ui",""),this.layer.style.cssText="position:absolute;top:0;left:0;width:0;height:0;",document.body.appendChild(this.layer),this.api.captureTokenFromHash();let n=await this.api.me();this.user=n.user,this.isAuthor=n.isAuthor,this.renderToolbar(),this.renderLogin(),await this.loadDoc(),document.addEventListener("mouseup",t=>{t.target.closest("[data-pen-ui]")||setTimeout(()=>this.onSelection(),0)}),document.addEventListener("mousedown",t=>this.onDocMouseDown(t)),document.addEventListener("click",t=>this.onDocClick(t)),document.addEventListener("mousemove",t=>this.onMouseMove(t),{passive:!0}),document.addEventListener("keydown",t=>{t.key==="Escape"&&(this.compose?this.dismissCompose():this.focused&&(this.focused=null,this.renderAll()))}),window.addEventListener("resize",()=>this.queueRelayout(),{passive:!0})}async reload(){this.dismissCompose(),this.removeQuoteBtn(),this.focused=this.hovered=null,this.root=this.resolveRoot(),this.source=this.computeSource(),await this.loadDoc()}async loadDoc(){let e="";this.user&&(e=(await this.api.getResponse(this.source).catch(()=>null))?.body??""),this.parse(e),this.renderAll()}parse(e){let{preamble:n,blocks:t}=H(e);this.preamble=n,this.blocks=t.map((o,s)=>({id:`b${s}`,quotes:o.quotes,note:o.note,isEmoji:k(o.note),ranges:o.quotes.map(r=>h([{type:"TextQuoteSelector",exact:r}],this.root)).filter(Boolean)}))}async saveDoc(){let e=M(this.preamble,this.blocks.map(t=>({quotes:t.quotes,note:t.note}))),n=$(e).map((t,o)=>({id:`q${o}`,text:t,selector:m(t,this.root)??[{type:"TextQuoteSelector",exact:t}]}));try{await this.api.saveResponse(this.source,e,n,this.commitSha)}catch(t){alert("Could not save: "+t.message);return}this.focused=null,this.parse(e),this.renderAll()}renderAll(){this.renderHighlights(),this.layoutRightRail(),this.layoutLeftRail()}queueRelayout(){this.relayoutQueued||(this.relayoutQueued=!0,requestAnimationFrame(()=>{this.relayoutQueued=!1,this.renderAll()}))}renderHighlights(){if(!Y)return;let e=window.CSS.highlights,n=globalThis.Highlight;if(this.responsePanel)return;if(!this.highlightsOn){e.delete("penumbra-quote"),e.delete("penumbra-quote-active"),e.delete("penumbra-draft");return}let t=this.blocks.flatMap(s=>s.ranges);t.length?e.set("penumbra-quote",new n(...t)):e.delete("penumbra-quote"),this.composeCtx?.range?e.set("penumbra-draft",new n(this.composeCtx.range)):e.delete("penumbra-draft");let o=this.blockById(this.hovered??this.focused)?.ranges[0];o?e.set("penumbra-quote-active",new n(o)):e.delete("penumbra-quote-active")}layoutRightRail(){if(this.layer.querySelectorAll(".pen-card.rail").forEach(l=>l.remove()),!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect();if(window.innerWidth-e.right<300)return;let n=this.cards().sort((l,c)=>this.docY(l.ranges[0])-this.docY(c.ranges[0]));if(!n.length)return;let t=window.scrollX+e.right+24,o=n.map(l=>{let c=this.buildCard(l,this.focused===l.id);return c.style.left=`${t}px`,c.style.top="-9999px",this.layer.appendChild(c),c}),s=o.map(l=>l.offsetHeight),r=n.map(l=>this.docY(l.ranges[0])),a=r.slice(),p=n.findIndex(l=>l.id===this.focused);if(p>=0){a[p]=r[p];for(let l=p+1;l<n.length;l++)a[l]=Math.max(r[l],a[l-1]+s[l-1]+T);for(let l=p-1;l>=0;l--)a[l]=Math.min(r[l],a[l+1]-s[l]-T)}else for(let l=1;l<n.length;l++)a[l]=Math.max(r[l],a[l-1]+s[l-1]+T);o.forEach((l,c)=>l.style.top=`${Math.max(0,a[c])}px`)}layoutLeftRail(){if(this.layer.querySelectorAll(".pen-emote").forEach(o=>o.remove()),!this.highlightsOn||this.responsePanel)return;let e=this.root.getBoundingClientRect(),n=window.scrollX+Math.max(6,e.left-40),t=0;for(let o of this.chips().sort((s,r)=>this.docY(s.ranges[0])-this.docY(r.ranges[0]))){let s=document.createElement("div");s.className="pen-emote",s.setAttribute("data-pen-ui",""),s.dataset.blockId=o.id,s.textContent=o.note.trim(),s.addEventListener("mouseenter",()=>this.setHovered(o.id)),s.addEventListener("mouseleave",()=>this.setHovered(null)),s.addEventListener("click",()=>this.focus(o.id)),this.layer.appendChild(s);let r=Math.max(this.docY(o.ranges[0]),t+6);s.style.left=`${n}px`,s.style.top=`${r}px`,t=r+s.offsetHeight}}buildCard(e,n){let t=document.createElement("div");t.className=`pen-card rail ${n?"focused":"compact"}`,t.setAttribute("data-pen-ui",""),t.dataset.blockId=e.id;let o=e.quotes.map(s=>`<div class="pen-quote">${L(s)}</div>`).join("");if(n){t.innerHTML=`${o}
        <div class="pen-reply"><textarea class="pen-note">${L(e.note)}</textarea>
          <div class="pen-row"><span class="pen-foot"><a data-act="delete">Delete</a></span>
            <button class="pen-btn" data-act="save">Save</button></div></div>`;let s=t.querySelector("textarea");Q(s),setTimeout(()=>s.focus(),0);let r=()=>{e.note=s.value,this.saveDoc()};t.querySelector('[data-act="save"]').addEventListener("click",r),s.addEventListener("keydown",a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),r())}),t.querySelector('[data-act="delete"]').addEventListener("click",()=>{confirm("Delete this comment?")&&(this.blocks=this.blocks.filter(a=>a.id!==e.id),this.saveDoc())})}else{let s=e.note.trim()?`<div class="pen-body pen-md">${d(e.note)}</div>`:'<div class="pen-body pen-muted">Add a comment\u2026</div>';t.innerHTML=`${o}<div class="pen-thread">${s}</div>`,t.addEventListener("click",()=>this.focus(e.id))}return t.addEventListener("mouseenter",()=>this.setHovered(e.id)),t.addEventListener("mouseleave",()=>this.setHovered(null)),t}focus(e){this.focused=e,this.renderAll()}setHovered(e){this.hovered!==e&&(this.hovered=e,this.layer.querySelectorAll("[data-block-id]").forEach(n=>n.classList.toggle("pen-emph",n.dataset.blockId===e)),this.renderHighlights())}onMouseMove(e){this.hoverRaf||this.responsePanel||(this.hoverRaf=!0,requestAnimationFrame(()=>{if(this.hoverRaf=!1,e.target?.closest?.("[data-pen-ui]"))return;let n=null;for(let t of this.blocks)if(t.ranges.some(o=>this.hitsRange(e,o))){n=t.id;break}this.setHovered(n)}))}onSelection(){let e=window.getSelection();if(!e||e.isCollapsed||e.rangeCount===0||!e.toString().trim()){this.removeQuoteBtn();return}let n=e.getRangeAt(0);if(this.root.contains(n.commonAncestorContainer)){if(this.responsePanel){this.showQuoteButton(n.cloneRange());return}this.openCompose(n.cloneRange())}}showQuoteButton(e){this.removeQuoteBtn();let n=e.getBoundingClientRect(),t=document.createElement("button");t.className="pen-addbtn",t.setAttribute("data-pen-ui",""),t.textContent="Quote",t.style.left=`${window.scrollX+n.left+n.width/2}px`,t.style.top=`${window.scrollY+n.top}px`,t.onmousedown=o=>{o.preventDefault(),o.stopPropagation()},t.onclick=()=>{this.responsePanel?.appendQuote(e),window.getSelection()?.removeAllRanges(),this.removeQuoteBtn()},this.layer.appendChild(t),this.quoteBtn=t}removeQuoteBtn(){this.quoteBtn?.remove(),this.quoteBtn=void 0}openCompose(e){if(!this.user)return this.promptSignIn(e);let n=g(e,this.root)?.find(a=>a.type==="TextQuoteSelector")?.exact??"";if(!n)return;this.dismissCompose();let t=e.getBoundingClientRect(),o=document.createElement("div");o.className="pen-compose",o.setAttribute("data-pen-ui",""),o.style.left=`${Math.min(window.scrollX+t.left,window.scrollX+window.innerWidth-372)}px`,o.style.top=`${window.scrollY+t.bottom+8}px`,o.innerHTML=`<textarea placeholder="Comment\u2026  (\u2318/Ctrl + \u23CE to send)"></textarea>
      <div class="pen-composebar">
        <div class="pen-emojibar">${X.map(a=>`<button data-emoji="${a}">${a}</button>`).join("")}</div>
        <button class="pen-btn" data-act="post">Comment</button></div>`;let s=o.querySelector("textarea");Q(s);let r=()=>{s.value.trim()&&this.addBlock(n,s.value.trim())};s.addEventListener("keydown",a=>{(a.metaKey||a.ctrlKey)&&a.key==="Enter"&&(a.preventDefault(),r())}),o.querySelectorAll("[data-emoji]").forEach(a=>a.addEventListener("click",()=>this.addBlock(n,a.dataset.emoji))),o.querySelector('[data-act="post"]').addEventListener("click",r),this.layer.appendChild(o),this.compose=o,this.composeCtx={range:e,quote:n},this.renderHighlights(),s.focus()}promptSignIn(e){this.dismissCompose();let n=e.getBoundingClientRect(),t=document.createElement("div");t.className="pen-compose",t.setAttribute("data-pen-ui",""),t.style.left=`${Math.min(window.scrollX+n.left,window.scrollX+window.innerWidth-372)}px`,t.style.top=`${window.scrollY+n.bottom+8}px`,t.innerHTML=`<div class="pen-title" style="margin-bottom:8px">Sign in to comment on this.</div>
      <div class="pen-row"><span></span><button class="pen-btn" data-act="signin">Sign in</button></div>`,t.querySelector('[data-act="signin"]').addEventListener("click",()=>{this.dismissCompose(),this.flashLogin()}),this.layer.appendChild(t),this.compose=t}addBlock(e,n){this.blocks.push({id:`b${this.blocks.length}`,quotes:[e],note:n,isEmoji:k(n),ranges:[]}),this.dismissCompose(),window.getSelection()?.removeAllRanges(),this.saveDoc()}dismissCompose(){this.compose?.remove(),this.compose=void 0,this.composeCtx=void 0,this.renderHighlights()}onDocMouseDown(e){e.target.closest("[data-pen-ui]")||(this.dismissCompose(),this.removeQuoteBtn())}onDocClick(e){if(!e.target.closest("[data-pen-ui]")&&!window.getSelection()?.toString().trim()){for(let n of this.blocks)if(n.ranges.some(t=>this.hitsRange(e,t)))return this.focus(n.id);this.focused&&(this.focused=null,this.renderAll())}}hitsRange(e,n){for(let t of n.getClientRects())if(e.clientX>=t.left&&e.clientX<=t.right&&e.clientY>=t.top&&e.clientY<=t.bottom)return!0;return!1}renderToolbar(){let e=document.createElement("div");e.className="pen-toolbar",e.setAttribute("data-pen-ui",""),e.innerHTML=`
      <button class="pen-tbtn active" data-act="toggle" title="Show/hide highlights">\u2726 Highlights</button>
      <span class="pen-sep"></span>
      <button class="pen-tbtn" data-act="response" title="Write a full response">\u270D Response</button>
      ${this.isAuthor?`<button class="pen-tbtn" data-act="reviews" title="See everyone's responses">\u{1F441} Reviews</button>`:""}`,e.querySelector('[data-act="toggle"]').addEventListener("click",()=>{this.highlightsOn=!this.highlightsOn,e.querySelector('[data-act="toggle"]').classList.toggle("active",this.highlightsOn),this.renderAll()}),e.querySelector('[data-act="response"]').addEventListener("click",()=>this.toggleResponse()),e.querySelector('[data-act="reviews"]')?.addEventListener("click",()=>this.toggleReviews()),document.body.appendChild(e),this.toolbar=e}toggleReviews(){if(this.reviewsPanel){this.reviewsPanel.close();return}this.reviewsPanel=new b({api:this.api,root:this.root,source:this.source,onClose:()=>{this.reviewsPanel=void 0}}),this.reviewsPanel.open()}toggleResponse(){if(this.responsePanel){this.responsePanel.close();return}if(!this.user)return this.flashLogin();this.toolbar?.querySelector('[data-act="response"]')?.classList.add("active"),this.layer.querySelectorAll(".pen-card.rail, .pen-emote").forEach(e=>e.remove()),this.responsePanel=new v({api:this.api,root:this.root,source:this.source,commitSha:this.commitSha,userName:this.user.name??"you",onClose:()=>{this.responsePanel=void 0,this.removeQuoteBtn(),this.toolbar?.querySelector('[data-act="response"]')?.classList.remove("active"),this.loadDoc()}}),this.responsePanel.open()}showTooltip(e,n){this.hideTooltip();let t=document.createElement("div");t.className="pen-tooltip",t.setAttribute("data-pen-ui",""),t.textContent=n,this.layer.appendChild(t);let o=e.getBoundingClientRect();t.style.left=`${window.scrollX+o.right+8}px`,t.style.top=`${window.scrollY+o.top}px`,this.tooltip=t}hideTooltip(){this.tooltip?.remove(),this.tooltip=void 0}renderLogin(){this.loginEl?.remove();let e=document.createElement("div");if(e.className="pen-login",e.setAttribute("data-pen-ui",""),this.user)e.innerHTML=`<span class="pen-title">Signed in as <span class="pen-name">${L(this.user.name??"you")}</span>${this.isAuthor?' <span class="pen-badge">author</span>':""}</span>
        <a class="pen-btn ghost" data-act="logout" style="margin-left:8px;text-decoration:none">Sign out</a>`,e.querySelector('[data-act="logout"]').addEventListener("click",async()=>{await this.api.logout(),this.user=null,this.isAuthor=!1,this.renderLogin(),this.loadDoc()});else{e.innerHTML=`<div class="pen-title">Sign in to comment</div>
        <div class="pen-providers"><input type="email" placeholder="you@email.com">
          <button class="pen-btn" data-act="email">Email me a link</button></div>`;let n=async()=>{let t=e.querySelector("input"),o=t.value.trim();if(!o)return;let s=await this.api.emailLogin(o);s.link?location.href=s.link:(t.value="",t.placeholder="Check your email \u2709\uFE0F")};e.querySelector('[data-act="email"]').addEventListener("click",n),e.querySelector("input").addEventListener("keydown",t=>{t.key==="Enter"&&n()})}document.body.appendChild(e),this.loginEl=e}flashLogin(){this.loginEl?.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:380,iterations:2})}},L=i=>String(i).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e]);function Q(i,e=7){let n=()=>{i.style.height="auto";let t=getComputedStyle(i),o=parseFloat(t.lineHeight)||20,s=parseFloat(t.paddingTop)+parseFloat(t.paddingBottom)+parseFloat(t.borderTopWidth)+parseFloat(t.borderBottomWidth),r=o*e+s;i.style.height=`${Math.min(i.scrollHeight,r)}px`,i.style.overflowY=i.scrollHeight>r?"auto":"hidden"};i.addEventListener("input",n),requestAnimationFrame(n)}function B(){let i=window.PENUMBRA;if(!i?.api){console.warn("[penumbra] window.PENUMBRA.api is not set; annotator disabled.");return}let e=new x(i);window.penumbra=e,e.init().catch(n=>console.error("[penumbra] init failed",n)),document.addEventListener("nav",()=>e.reload().catch(n=>console.error("[penumbra] reload failed",n)))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",B):B();})();
//# sourceMappingURL=penumbra.js.map
