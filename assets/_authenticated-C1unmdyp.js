import{a as i,u as s,r as o,j as e,O as n}from"./index-BnPyeoe5.js";function l(){const{data:a,isLoading:r}=i(),t=s();return o.useEffect(()=>{if(!r){if(!a?.user){t({to:"/login",replace:!0});return}a.profile?.blocked_at&&t({to:"/blocked",replace:!0})}},[a,r,t]),r?e.jsxs("div",{style:{display:"grid",placeItems:"center",minHeight:"100vh",background:"var(--background, #f9fafb)"},children:[e.jsx("style",{children:`
          @keyframes rc-breathe {
            0%, 100% { transform: scale(1);   opacity: 1; }
            50%       { transform: scale(1.06); opacity: 0.85; }
          }
          @keyframes rc-fadein {
            from { opacity: 0; transform: scale(0.88); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes rc-bar {
            0%   { width: 0%; opacity: 1; }
            80%  { width: 100%; opacity: 1; }
            100% { width: 100%; opacity: 0; }
          }
          .rc-logo-anim {
            animation: rc-fadein 0.4s ease-out forwards,
                       rc-breathe 2s ease-in-out 0.4s infinite;
          }
          .rc-bar-anim {
            animation: rc-bar 1.8s ease-in-out infinite;
          }
        `}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:20},children:[e.jsx("img",{src:"/1.png",alt:"Rézo Campus",className:"rc-logo-anim",style:{width:120,height:120,objectFit:"contain"}}),e.jsx("div",{style:{width:120,height:3,borderRadius:999,background:"var(--border, #e4e7e7)",overflow:"hidden"},children:e.jsx("div",{className:"rc-bar-anim",style:{height:"100%",background:"var(--primary, #0e6b6f)",borderRadius:999}})})]})]}):!a?.user||a.profile?.blocked_at?null:e.jsx(n,{})}export{l as component};
