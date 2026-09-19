let readyPromise = null;

function mathJaxReady() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise(resolve => {
    const poll = () => {
      if (window.MathJax?.startup?.promise) {
        window.MathJax.startup.promise.then(resolve).catch(resolve);
      } else if (window.MathJax?.typesetPromise) {
        resolve();
      } else {
        setTimeout(poll, 80);
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
      window.MathJax.typesetPromise?.(clean)?.catch?.(() => {});
    } catch (_) {}
  });
}
