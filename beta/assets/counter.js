/* Private visit counter. GoatCounter: no cookies, no personal data, and the dashboard is seen only by the account owner.
   Off until CODE holds the GoatCounter site code (the "xxx" in xxx.goatcounter.com); counts only on the public site. */
(()=>{const CODE='';
 if(!CODE||location.hostname!=='jwilliamkennedy.github.io')return;
 const s=document.createElement('script');s.async=true;s.src='https://gc.zgo.at/count.js';
 s.setAttribute('data-goatcounter','https://'+CODE+'.goatcounter.com/count');document.head.appendChild(s);})();
