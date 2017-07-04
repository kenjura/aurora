// // first, ensure all h1s, h2s, and h3s have a valid id
  const headers = document.querySelectorAll('h1, h2, h3');
  for (var i = 0; i < headers.length; i++) {
    headers[i].id = headers[i].id || headers[i].tagName.toLowerCase()+'-'+i;
  }

//   // now, render TOC
//   const tocHtml = nodelistToArray(headers)
//     // .filter( n => ['H1','H2','H3'].includes(n.tagName) )
//     // .forEach( n => n.id = n.id || n.tagName+'-'+(i++) )
//     .map( n => `<li level="${n.tagName.substr(-1,1)}"><a href="#${n.id}">${n.innerText}</li>` )
//     .join('');

//   document.getElementById('toc').innerHTML = `<ul>${tocHtml}</ul>`;

  const nestedHeaders = nest(nodelistToArray(headers));
  const tocHorizontalHtml = nestedHeaders.map( h => {
    childHtml = h.h2s && `<ul>${h.h2s.map( h2 => `<li><a href="#">${h2.innerText}</a></li>`).join('')}</ul>`;
    return `<li><a href="#${h.id}">${h.innerText}</a>${childHtml}</li>`;
  }).join('');
  document.getElementById('toc-horizontal').innerHTML = `<ul>${tocHorizontalHtml}</ul>`;

  function nodelistToArray(nodelist) {
    return [].slice.call(nodelist);
  }
  function nest(nodes, currentLevel=1) {
    // nodes is an array of htmlelements that are headers, in order found in dom
    // currentLevel is an integer, 1 for h1, 2 for h2, etc
    // note: all nodes must have a unique id!!!
    let h1s = [];
    for (var i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.tagName=='H1') { node.h2s = []; h1s.push(node); }
      if (node.tagName=='H2') { node.h3s = []; last(h1s).h2s.push(node); }
      if (node.tagName=='H3') { last(last(h1s).h2s).h3s.push(node) }
    }
    return h1s;

    function last(arr) {
      return arr[arr.length-1];
    }
  }