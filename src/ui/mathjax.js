let readyPromise = null;

function mathJaxReady() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise(resolve => {
    let attempts = 0;
    const poll = () => {
      if (window.MathJax?.startup?.promise) {
        window.MathJax.startup.promise.then(resolve).catch(resolve);
      } else if (window.MathJax?.typesetPromise) {
        resolve();
      } else if (++attempts < 50) {
        setTimeout(poll, 100);
      } else {
        console.warn('[CrystalLab] MathJax did not become ready after 5 s; math will render as raw TeX.');
        resolve();
      }
    };
    poll();
  });
  return readyPromise;
}

export function typesetMath(nodes) {
  const clean = (nodes ?? []).filter(Boolean);
  if (!clean.length) return;
  mathJaxReady().then(() => {
    try {
      window.MathJax.typesetPromise?.(clean)?.catch?.(err => {
        console.warn('[CrystalLab] MathJax typeset error:', err?.message ?? err);
      });
    } catch (err) {
      console.warn('[CrystalLab] MathJax typeset threw:', err?.message ?? err);
    }
  });
}
