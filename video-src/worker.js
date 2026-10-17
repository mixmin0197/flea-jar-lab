importScripts('scene.js');
onmessage=async e=>{
  D=e.data.D;if(e.data.lang)setLang(e.data.lang);
  try{
    const N=TOTAL*FPS;
    for(let i=0;i<N;i++){drawAt(i/FPS);const blob=await cv.convertToBlob({type:'image/jpeg',quality:0.92});
      await fetch('/frame',{method:'POST',body:blob});if(i%30===0||i===N-1)postMessage({frame:i+1});}
    postMessage({done:true});
  }catch(err){postMessage({err:String(err)});}
};
