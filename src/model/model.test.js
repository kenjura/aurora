// require('dotenv').config({path: '/etc/aurora.env'});

const chai   = require('chai');
const mock   = require('mock-fs');
const path   = require('path');
const rewire = require('rewire');

const index = rewire('./index.js');
const expect = chai.expect;

const getAutoIndex = index.__get__('getAutoIndex')
const getContent   = index.__get__('getContent')
const getRealpath  = index.__get__('getRealpath')

process.env.WIKIROOT = '/wikiroot';

mock({
  '/wikiroot': {
    'db1': {
      'folder1': {
        'article1a.txt': 'article1a content',
        'article1b.html': 'article1b content'
      },
      'folder2': {
        'index.txt': 'folder2 index'
      },
      'article0.txt': 'article0 content',
      'index.txt': 'db1 index content',
      'menu.yml': 'menu.yml content',
      'style.css': 'style.css content',
    },
    'db2': {

    },
    'index.html': 'root index.html content'
  }
})

function mockGetRealpath(pathname) {
  // warning: much simpler than the real thing. Only use if you know what you're doing
  return path.join(process.env.WIKIROOT, pathname);
}

describe('getAutoIndex',() => {
  it('gets the right content for /',() => {
    expect(getAutoIndex('/wikiroot/')).to.equal('<ul><li><a href="/db1">db1</a>,<li><a href="/db2">db2</a>,<li><a href="/index.html">index</a></ul>');
  });
  it('gets the right content for /db1',() => {
    expect(getAutoIndex('/wikiroot/db1')).to.equal('<ul><li><a href="/db1/article0.txt">article0</a>,<li><a href="/db1/folder1">folder1</a>,<li><a href="/db1/folder2">folder2</a>,<li><a href="/db1/index.txt">index</a>,<li><a href="/db1/menu.yml">menu</a>,<li><a href="/db1/style.css">style</a></ul>');
  });
});

describe('getContent', () => {
  it('gets the right content for /', () => {
    expect(getContent('/wikiroot/index.html')).to.equal('root index.html content');
  });
  it('gets the right content for /db1', () => {
    expect(getContent('/wikiroot/db1/index.txt')).to.equal('<h1>articleName</h1>\n<p>db1 index content</p>');
  });
  it('gets the right content for /db1/article0.txt', () => {
    expect(getContent('/wikiroot/db1/article0.txt')).to.equal('<h1>articleName</h1>\n<p>article0 content</p>');
  });
  it('gets the right content for /db1/folder2/index.txt', () => {
    expect(getContent('/wikiroot/db1/folder2/index.txt')).to.equal('<h1>articleName</h1>\n<p>folder2 index</p>');
  });
});

describe('getRealpath', () => {

  // before(() => {
  // });

  // beforeEach(async () => {
  //   await Workflow.remove({});
  //   await Factory.createMany('workflow', NUMBER_OF_TEST_DOCUMENTS);
  // });

  it('gets the right path for /', () => {
    const realpath = getRealpath('/');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/index.html'));
  });

  it('gets the right path for /db1', () => {
    const realpath = getRealpath('/db1');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/index.txt'));
  });

  it('gets the right path for /db1/folder1/article1a.txt', () => {
    const realpath = getRealpath('/db1/folder1/article1a.txt');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/folder1/article1a.txt'));
  });

  it('gets the right path for /db1/folder2', () => {
    const realpath = getRealpath('/db1/folder2');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/folder2/index.txt'));
  });

  it('gets the right path for /db1/folder1/article1b.html', () => {
    const realpath = getRealpath('/db1/folder1/article1b.html');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/folder1/article1b.html'));
  });

  it('gets the right path for /db1/folder1/article1a', () => {
    const realpath = getRealpath('/db1/folder1/article1a');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/folder1/article1a.txt'));
  });

  it('gets the right path for /db1/folder1/article1b', () => {
    const realpath = getRealpath('/db1/folder1/article1b');
    expect(realpath).to.equal(path.join(process.env.WIKIROOT, '/db1/folder1/article1b.html'));
  });
});
