(function() {
  const content = document.querySelector('#mainContent');
  const tocContainer = document.querySelector('#toc');

  if (!content || !tocContainer) return;

  const headings = content.querySelectorAll('h1, h2, h3, h4, h5, h6');
  if (!headings.length) return;

  const rootOl = document.createElement('ol');
  let currentLevel = 1;
  let currentOl = rootOl;
  const olStack = [rootOl];

  headings.forEach(h => {
    const level = parseInt(h.tagName.substring(1), 10);

    // Ensure heading has an id
    if (!h.id) {
      h.id = h.textContent.trim().toLowerCase().replace(/\s+/g, '-');
    }

    // Create TOC link
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.textContent = h.textContent;
    a.setAttribute('data-spy', `#${h.id}`);

    const li = document.createElement('li');
    li.appendChild(a);

    // Adjust nesting
    if (level > currentLevel) {
      // go deeper
      const newOl = document.createElement('ol');
      olStack[olStack.length - 1].lastElementChild.appendChild(newOl);
      olStack.push(newOl);
      currentOl = newOl;
      currentLevel = level;
    } else if (level < currentLevel) {
      // climb up
      while (level < currentLevel && olStack.length > 1) {
        olStack.pop();
        currentLevel--;
      }
      currentOl = olStack[olStack.length - 1];
    }
    currentOl.appendChild(li);
  });

  tocContainer.innerHTML = ''; // clear old content
  tocContainer.appendChild(rootOl);
})();
