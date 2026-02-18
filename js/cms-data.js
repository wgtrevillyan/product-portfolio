/**
 * CMS Data Loader - Populates static HTML with data from JSON files.
 * Expects data/products.json, data/companies.json, data/patents.json, etc.
 */
(function () {
  'use strict';

  async function fetchJSON(path) {
    const url = '/data/' + path;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${path}`);
    return res.json();
  }

  function getPageType() {
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path === '/' || path === '' || path.endsWith('/') && path.length <= 2) return 'index';
    const productsMatch = path.match(/^\/products\/([^/]+)$/);
    if (productsMatch) return 'detail_product';
    if (path === '/products') return 'products';
    const companiesMatch = path.match(/^\/companies\/([^/]+)$/);
    if (companiesMatch) return 'detail_company';
    if (path === '/companies') return 'companies';
    const patentsMatch = path.match(/^\/patents\/([^/]+)$/);
    if (patentsMatch) return 'detail_patent';
    if (path === '/patents') return 'patents';
    if (path.includes('skills')) return path.includes('detail_') ? 'detail_skill' : 'skills';
    return null;
  }

  function getSlug() {
    const path = window.location.pathname;
    const productsMatch = path.match(/^\/products\/([^/]+)$/);
    if (productsMatch) return productsMatch[1];
    const companiesMatch = path.match(/^\/companies\/([^/]+)$/);
    if (companiesMatch) return companiesMatch[1];
    const patentsMatch = path.match(/^\/patents\/([^/]+)$/);
    if (patentsMatch) return patentsMatch[1];
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || params.get('item');
  }

  function formatDate(str) {
    if (!str) return '';
    const m = str.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) return `${m[1]} ${m[2]}, ${m[3]}`;
    return str;
  }

  /** Format date as "Dec 2025" for list display */
  function formatEndDateShort(str) {
    if (!str) return '';
    const m = str.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/);
    if (m) return `${m[1]} ${m[3]}`;
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return str;
  }

  function parseDateForSort(str) {
    if (!str) return 0;
    const d = new Date(str);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  /** Items in progress with no end date sort first (top). getEndDate(item) returns the end date; inProgress(item) returns true to force top. */
  function sortValueForEndDate(item, getEndDate, inProgress) {
    const endDate = getEndDate(item);
    if (inProgress && inProgress(item)) return Number.MAX_SAFE_INTEGER; /* tiebreak: use start date */
    return parseDateForSort(endDate);
  }

  function setText(el, text) {
    if (el) {
      el.textContent = text || '';
      el.classList.remove('w-dyn-bind-empty');
    }
  }

  function setHtml(el, html) {
    if (el) {
      el.innerHTML = html || '';
      el.classList.remove('w-dyn-bind-empty');
    }
  }

  function setAttr(el, attr, val) {
    if (el && val) el.setAttribute(attr, val);
  }

  /** Set document title and og/twitter meta titles for detail pages */
  function setPageTitle(title) {
    if (!title) return;
    document.title = title;
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', title);
    const twitterTitle = document.querySelector('meta[name="twitter:title"], meta[property="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', title);
  }

  function setImgSrc(img, src) {
    if (img && src) {
      img.src = src;
      img.style.display = '';
      img.classList.remove('w-dyn-bind-empty');
    }
  }

  /** Set Time Period / Tenure on detail pages: "Jan 2025 - Dec 2025" or "Jan 2025 - Present" */
  function setTimePeriod(label, startDate, endDate) {
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === label
    );
    if (!item) return;
    const startEl = item.querySelector('.text-block');
    const endEl = item.querySelector('.text-block-2.w-dyn-bind-empty') || item.querySelectorAll('.text-block-2')[0];
    const presentEl = item.querySelectorAll('.text-block-2')[1];
    if (startEl) setText(startEl, formatEndDateShort(startDate));
    if (endEl) setText(endEl, endDate ? formatEndDateShort(endDate) : 'Present');
    if (presentEl) presentEl.style.display = 'none';
  }

  /** Set a portfolio-header-metatag-item text by its h2 label (e.g. "Type", "Industry") */
  function setMetatagByLabel(label, value) {
    if (!value) return;
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === label
    );
    if (!item) return;
    const textEl = item.querySelector('.text-block');
    if (textEl) setText(textEl, value);
  }

  /** Format funding for display - returns amount only (HTML has static $). e.g. 1900000 -> "1.9M", "25K" -> "25K" */
  function formatFunding(val) {
    if (val === '' || val == null) return '';
    const s = String(val).trim().replace(/^\$/, '');
    if (/^\d+$/.test(s)) {
      const n = parseInt(s, 10);
      if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
      return String(n);
    }
    return s;
  }

  /** Set Funding metatag (Recent Funding + Recent Stage, e.g. "$ 220M Series B") */
  function setFundingMetatag(fundingValue, stageValue) {
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === 'Funding'
    );
    if (!item) return;
    const funding = formatFunding(fundingValue);
    const stage = stageValue ? String(stageValue).trim() : '';
    const display = [funding, stage].filter(Boolean).join(' ');
    if (!display) return;
    const textEl = item.querySelector('.div-block .text-block');
    if (textEl) setText(textEl, display);
  }

  /** Set Headcount metatag (Start → End) */
  function setHeadcountMetatag(start, end) {
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === 'Headcount'
    );
    if (!item) return;
    const startEl = item.querySelector('.div-block .text-block');
    const endEl = item.querySelector('.div-block .text-block-2');
    if (startEl) setText(startEl, start !== '' && start != null ? String(start) : '');
    if (endEl) setText(endEl, end !== '' && end != null ? String(end) : '');
  }

  /** Set Founded metatag (Founding Year) - displays year only */
  function setFoundedMetatag(value) {
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === 'Founded'
    );
    if (!item || !value) return;
    const m = String(value).match(/\d{4}/);
    const year = m ? m[0] : value;
    const textEl = item.querySelector('.div-block .text-block-3');
    if (textEl) setText(textEl, year);
  }

  /** Hide portfolio-header-metatag-item by label when no data to display */
  function hideMetatagIfEmpty(label, hasData) {
    const item = [...document.querySelectorAll('.portfolio-header-metatag-item')].find(
      el => el.querySelector('h2')?.textContent?.trim() === label
    );
    if (item) item.style.display = hasData ? '' : 'none';
  }

  // --- INDEX PAGE ---
  async function renderIndex(data) {
    const { products, companies, skills } = data;

    const getSortOrder = (p) => parseInt(p['Sort Order'], 10) || 999;
    const featuredProducts = products
      .filter(p => p.Featured === 'true')
      .sort((a, b) => {
        const diff = getSortOrder(a) - getSortOrder(b);
        return diff !== 0 ? diff : (a.Name || '').localeCompare(b.Name || '');
      })
      .slice(0, 6);
    const companiesMap = Object.fromEntries(companies.map(c => [c.Slug, c]));
    const skillsMap = Object.fromEntries(skills.map(s => [s.Slug, s]));

    // Companies (logos) - first company logo block
    const logoItems = document.querySelectorAll('.logo-wrapper.w-dyn-item');
    if (logoItems.length && companies.length) {
      const list = logoItems[0].closest('.w-dyn-items');
      const template = logoItems[0].cloneNode(true);
      if (list) {
        list.innerHTML = '';
        list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        companies.forEach(c => {
          const clone = template.cloneNode(true);
          const link = clone.querySelector('a.logo-link-block, a[id*="company"]');
          if (link) {
            link.href = `/companies/${c.Slug}`;
            const logoUrl = c['Logo (White)'] || c['Logo (blue)'] || c.Thumbnail;
            if (logoUrl) {
              link.innerHTML = '';
              link.classList.add('logo-link-mask');
              link.style.webkitMaskImage = `url("${logoUrl}")`;
              link.style.maskImage = `url("${logoUrl}")`;
            }
          }
          list.appendChild(clone);
        });
      }
    }

    // Featured products (portfolio list)
    const portfolioItems = document.querySelectorAll('.portfolio-list .w-dyn-item');
    if (portfolioItems.length && featuredProducts.length) {
      const list = portfolioItems[0].closest('.w-dyn-items');
      const template = portfolioItems[0].cloneNode(true);
      if (list) {
        list.innerHTML = '';
        list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        featuredProducts.forEach(p => {
          const clone = template.cloneNode(true);
          const detailUrl = `/products/${p.Slug}`;
          clone.querySelectorAll('a.portfolio-image-link, a[id*="view-project"]').forEach(a => { a.href = detailUrl; });
          setImgSrc(clone.querySelector('.portfolio-image'), p['Thumbnai Image'] || p['Project Image']);
          const overlay = clone.querySelector('.image-overlay');
          if (overlay) overlay.style.transform = 'translate3d(0, 100%, 0)';
          const company = companies.find(c => c.Slug === p['Startup Company']);
          setText(clone.querySelector('.heading-style-h5'), p.Name);
          setText(clone.querySelector('.heading-style-h6'), p['50 Character Description']);
          setText(clone.querySelector('.text-size-regular.dark'), p.Summary);
          const tagList = clone.querySelector('.portfolio-tag-list');
          if (tagList) {
            const tagTemplate = tagList.querySelector('.w-dyn-item');
            const skillSlugs = p.Skills || [];
            if (tagTemplate && skillSlugs.length) {
              const tagTemplateCopy = tagTemplate.cloneNode(true);
              tagList.innerHTML = '';
              skillSlugs.forEach(slug => {
                const tagClone = tagTemplateCopy.cloneNode(true);
                const skill = skillsMap[slug];
                setText(tagClone.querySelector('.portfolio-tag-item .tag-text'), skill?.Name || slug);
                tagList.appendChild(tagClone);
              });
            }
          }
          list.appendChild(clone);
        });
      }
    }

    // Skills
    const skillItems = document.querySelectorAll('.service-component .service-item');
    if (skillItems.length && skills.length) {
      const wrapper = skillItems[0].closest('.w-dyn-item');
      const list = wrapper?.closest('.w-dyn-items');
      const template = wrapper?.cloneNode(true);
      if (list && template) {
        list.innerHTML = '';
        list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        skills.forEach(s => {
          const clone = template.cloneNode(true);
          setText(clone.querySelector('.text-size-medium.text-color-white'), s.Name);
          setText(clone.querySelector('p.w-dyn-bind-empty'), s.Description);
          list.appendChild(clone);
        });
      }
    }
  }

  // --- PRODUCTS LIST PAGE ---
  async function renderProductsList(products) {
    const items = document.querySelectorAll('.work-item');
    if (!items.length) return;
    const wrapper = items[0].closest('.w-dyn-item');
    const list = wrapper?.closest('.w-dyn-items');
    if (!list) return;

    const prodInProgress = p => p['In Progress'] === 'true' && !p['End Date'];
    const sorted = [...products].sort((a, b) => sortValueForEndDate(b, p => p['End Date'], prodInProgress) - sortValueForEndDate(a, p => p['End Date'], prodInProgress));
    const template = wrapper.cloneNode(true);
    list.innerHTML = '';
    list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
    sorted.forEach(p => {
      const clone = template.cloneNode(true);
      const workItem = clone.querySelector('.work-item');
      const link = clone.querySelector('a.work-link, a[id*="product"]');
      if (link) link.href = `/products/${p.Slug}`;
      setText(workItem?.querySelector('.products'), p.Name);
      setText(workItem?.querySelector('.work-heading .text-size-medium'), p['50 Character Description'] || p.Summary);
      const dateEl = workItem?.querySelector('.work-heading + .portfolio-date');
      setText(dateEl, p['End Date'] ? formatEndDateShort(p['End Date']) : 'In Progress');
      setImgSrc(workItem?.querySelector('.product-list-thumbnail-image'), p['Thumbnai Image'] || p['Project Image']);
      const inProgress = workItem?.querySelectorAll('.portfolio-date')[1];
      if (inProgress && p['In Progress'] === 'true') inProgress.style.display = '';
      else if (inProgress) inProgress.style.display = 'none';
      list.appendChild(clone);
    });
  }

  // --- COMPANIES LIST PAGE ---
  async function renderCompaniesList(companies) {
    const items = document.querySelectorAll('.work-item');
    if (!items.length) return;
    const wrapper = items[0].closest('.w-dyn-item');
    const list = wrapper?.closest('.w-dyn-items');
    if (!list) return;

    const coInProgress = c => !c['End Date'];
    const sorted = [...companies].sort((a, b) => sortValueForEndDate(b, c => c['End Date'], coInProgress) - sortValueForEndDate(a, c => c['End Date'], coInProgress));
    const template = wrapper.cloneNode(true);
    list.innerHTML = '';
    list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
    sorted.forEach(c => {
      const clone = template.cloneNode(true);
      const workItem = clone.querySelector('.work-item');
      const link = clone.querySelector('a.work-link, a[id*="product"]');
      if (link) link.href = `/companies/${c.Slug}`;
      setText(workItem?.querySelector('.products'), c.Name);
      setText(workItem?.querySelector('.work-heading .text-size-medium'), c['50 Character Description']);
      const dateEl = workItem?.querySelector('.work-heading + .portfolio-date');
      setText(dateEl, c['End Date'] ? formatEndDateShort(c['End Date']) : 'In Progress');
      setImgSrc(workItem?.querySelector('.product-list-thumbnail-image'), c.Thumbnail || c['Hero Image']);
      const inProgressBadge = workItem?.querySelectorAll('.portfolio-date')[1];
      if (inProgressBadge) inProgressBadge.style.display = 'none';
      list.appendChild(clone);
    });
  }

  // --- PATENTS LIST PAGE ---
  async function renderPatentsList(patents) {
    const items = document.querySelectorAll('.work-item');
    if (!items.length) return;
    const wrapper = items[0].closest('.w-dyn-item');
    const list = wrapper?.closest('.w-dyn-items');
    if (!list) return;

    const patentEndDate = p => p['Patented Date'] || p['End Date'];
    const patentInProgress = p => p['In Progress'] === 'true' && !patentEndDate(p);
    const sorted = [...patents].sort((a, b) => sortValueForEndDate(b, patentEndDate, patentInProgress) - sortValueForEndDate(a, patentEndDate, patentInProgress));
    const template = wrapper.cloneNode(true);
    list.innerHTML = '';
    list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
    sorted.forEach(p => {
      const clone = template.cloneNode(true);
      const workItem = clone.querySelector('.work-item');
      const link = clone.querySelector('a.work-link, a[id*="product"]');
      if (link) link.href = p['Google Patent URL'] || `/patents/${p.Slug}`;
      setText(workItem?.querySelector('.products'), p.Name);
      const flexParts = workItem?.querySelectorAll('.flex-block-3 .text-size-medium');
      if (flexParts?.[0]) setText(flexParts[0], p['Application ID'] || '');
      if (flexParts?.[2]) setText(flexParts[2], p.Summary || p['50 Character Description'] || '');
      const dateEl = workItem?.querySelector('.work-heading + .portfolio-date');
      const patentDate = p['Patented Date'] || p['End Date'];
      setText(dateEl, patentDate ? formatEndDateShort(patentDate) : 'In Progress');
      setImgSrc(workItem?.querySelector('.product-list-thumbnail-image'), p['Thumbnai Image'] || p['Project Image']);
      const patentPendingBadge = workItem?.querySelectorAll('.portfolio-date')[1];
      if (patentPendingBadge) patentPendingBadge.style.display = 'none';
      list.appendChild(clone);
    });
  }

  // --- DETAIL PRODUCT PAGE ---
  async function renderDetailProduct(product, companies, productImages, skills = []) {
    const company = companies.find(c => c.Slug === product['Startup Company']);
    const images = (productImages || []).filter(pi => pi.Product === product.Slug);
    const skillsMap = Object.fromEntries((skills || []).map(s => [s.Slug, s]));

    setPageTitle('Product - ' + (product.Name || ''));
    setText(document.querySelector('.portfolio-header-content-left h1'), product.Name);
    setText(document.querySelector('.portfolio-header-content-left h4'), product['50 Character Description'] || product.Summary);
    setText(document.querySelector('.portfolio-header-content-left .text-size-medium'), product.Description || '');
    setImgSrc(document.querySelector('.hero-image'), product['Project Image'] || product['Thumbnai Image']);

    const tagList = document.querySelector('.portfolio-header-tag-list');
    const skillSlugs = product.Skills || [];
    if (tagList && skillSlugs.length) {
      const template = tagList.querySelector('.w-dyn-item');
      if (template) {
        const templateCopy = template.cloneNode(true);
        tagList.innerHTML = '';
        skillSlugs.forEach(slug => {
          const clone = templateCopy.cloneNode(true);
          const skill = skillsMap[slug];
          setText(clone.querySelector('.portfolio-header-tag-item .tag-text'), skill?.Name || slug);
          tagList.appendChild(clone);
        });
      }
    }

    if (company) {
      const logoLink = document.querySelector('#body-company-button');
      if (logoLink) {
        logoLink.href = `/companies/${company.Slug}`;
        const logoUrl = company['Logo (White)'] || company.Thumbnail;
        if (logoUrl) {
          logoLink.style.webkitMaskImage = `url("${logoUrl}")`;
          logoLink.style.maskImage = `url("${logoUrl}")`;
        }
      }
    }

    setTimePeriod('Time Period', product['Start Date'], product['End Date']);

    setHtml(document.querySelector('#section-highlights + .w-richtext, .w-dyn-bind-empty.w-richtext'), product.Highlights || '');
    setHtml(document.querySelector('#section-press-release .w-richtext'), product['Press Release'] || '');
    const richTexts = document.querySelectorAll('.text-rich-text.w-richtext');
    if (richTexts.length) setHtml(richTexts[richTexts.length - 1], product['Services Text'] || '');

    // Product images gallery
    if (images.length) {
      const imgTemplate = document.querySelector('.collection-item-2.w-dyn-item');
      const imgList = document.querySelector('.collection-list-3.w-dyn-items');
      const section = document.getElementById('section-screenshots');
      if (imgTemplate && imgList) {
        imgList.innerHTML = '';
        imgList.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        images.forEach((pi, i) => {
          const clone = imgTemplate.cloneNode(true);
          const link = clone.querySelector('.product-image-wrapper');
          const img = clone.querySelector('.product-image');
          const desc = clone.querySelector('.product-image-description');
          const enlargedImg = clone.querySelector('.enlarged-product-image');
          const enlargedDescEl = clone.querySelector('.enlarged-product-image-display-wrapper .product-image-description');
          const closeBtn = clone.querySelector('.close-button-wrapper');
          const sliderLeft = clone.querySelector('.slider-button[arrowbuttontype="left"]');
          const sliderRight = clone.querySelector('.slider-button[arrowbuttontype="right"]');

          const imgId = `product-img-${product.Slug}-${i}`;
          if (link) {
            link.id = imgId;
            link.setAttribute('productname', product.Name);
            link.setAttribute('productimagename', pi.Name);
          }
          setImgSrc(img, pi.Image);
          setText(desc, pi['Image Description']);

          setImgSrc(enlargedImg, pi.Image);
          setText(enlargedDescEl, pi['Image Description']);

          [closeBtn, sliderLeft, sliderRight].forEach((btn, j) => {
            if (btn) {
              if (btn === closeBtn && i === 0) {
                btn.id = 'close-image-button';
              } else if (btn === sliderLeft && i === 0) {
                btn.id = 'slider-button-left';
              } else if (btn === sliderRight && i === 0) {
                btn.id = 'slider-button-right';
              } else {
                btn.removeAttribute('id');
              }
              btn.setAttribute('currentproductimageid', imgId);
              btn.setAttribute('currentimagename', pi.Name);
              btn.setAttribute('currentproduct', product.Name);
            }
          });
          if (sliderLeft) sliderLeft.setAttribute('arrowbuttontype', 'left');
          if (sliderRight) sliderRight.setAttribute('arrowbuttontype', 'right');

          imgList.appendChild(clone);
        });

        if (!imgList._productVisualsDelegation) {
          imgList._productVisualsDelegation = true;
          const hideAllEnlarged = () => {
            document.querySelectorAll('.enlarged-product-image-display-wrapper').forEach((el) => {
              el.style.display = 'none';
            });
          };
          const showEnlarged = (wrapper) => {
            hideAllEnlarged();
            if (wrapper) wrapper.style.display = 'block';
          };

          (section || document).addEventListener('click', (ev) => {
            const link = ev.target.closest('.product-image-wrapper');
            if (link && imgList.contains(link)) {
              ev.preventDefault();
              const item = link.closest('.collection-item-2');
              const wrapper = item?.querySelector('.enlarged-product-image-display-wrapper');
              showEnlarged(wrapper);
            }

            const closeBtn = ev.target.closest('.close-button-wrapper');
            if (closeBtn && imgList.contains(closeBtn)) {
              ev.preventDefault();
              const wrapper = closeBtn.closest('.enlarged-product-image-display-wrapper');
              if (wrapper) wrapper.style.display = 'none';
            }

            const sliderBtn = ev.target.closest('.slider-button');
            if (sliderBtn && imgList.contains(sliderBtn)) {
              ev.preventDefault();
              const currentId = sliderBtn.getAttribute('currentproductimageid');
              const direction = sliderBtn.getAttribute('arrowbuttontype');
              const ids = Array.from(imgList.querySelectorAll('.product-image-wrapper[id]')).map((el) => el.id);
              const idx = ids.indexOf(currentId);
              if (idx === -1) return;
              const nextIdx = direction === 'right' ? idx + 1 : idx - 1;
              const nextId = ids[nextIdx];
              if (nextId) {
                hideAllEnlarged();
                const nextLink = document.getElementById(nextId);
                if (nextLink) nextLink.click();
              }
            }
          });

          document.addEventListener('keydown', (ev) => {
            if (ev.key !== 'Escape') return;
            const visible = Array.from(document.querySelectorAll('.enlarged-product-image-display-wrapper')).find(
              (el) => el.style.display === 'block'
            );
            if (visible) visible.style.display = 'none';
          });
        }
      }
    }
  }

  // --- DETAIL COMPANY PAGE ---
  async function renderDetailCompany(company, products, patents, skills = []) {
    const productSlugs = (company.Products || []).map(s => s.trim());
    const patentSlugs = (company.Patents || []).map(s => s.trim());
    const companyProducts = (products || []).filter(p => productSlugs.includes(p.Slug));
    const companyPatents = (patents || []).filter(p => patentSlugs.includes(p.Slug));
    const skillsMap = Object.fromEntries((skills || []).map(s => [s.Slug, s]));

    setPageTitle('Company - ' + (company.Name || ''));
    setText(document.querySelector('.portfolio-header-content-left h1'), company.Name);
    setText(document.querySelector('.portfolio-header-content-left h4'), company['50 Character Description'] || '');
    setText(document.querySelector('.portfolio-header-content-left .text-size-medium'), company['Detailed Description'] || '');
    setImgSrc(document.querySelector('.hero-image'), company['Hero Image'] || company.Thumbnail);

    // Skills list (not tags)
    const tagList = document.querySelector('.portfolio-header-component .portfolio-header-tag-list');
    const skillSlugs = company.Skills || [];
    if (tagList && skillSlugs.length) {
      const template = tagList.querySelector('.w-dyn-item');
      if (template) {
        const templateCopy = template.cloneNode(true);
        tagList.innerHTML = '';
        tagList.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        skillSlugs.forEach(slug => {
          const clone = templateCopy.cloneNode(true);
          const skill = skillsMap[slug];
          setText(clone.querySelector('.portfolio-header-tag-item .tag-text'), skill?.Name || slug);
          tagList.appendChild(clone);
        });
      }
    }

    const logoLink = document.querySelector('#body-company-logo-button');
    if (logoLink) {
      logoLink.href = company.Website || company['Website Short'] || '#';
      const logoUrl = company['Logo (White)'] || company.Thumbnail;
      if (logoUrl) {
        logoLink.style.webkitMaskImage = `url("${logoUrl}")`;
        logoLink.style.maskImage = `url("${logoUrl}")`;
      }
    }

    const websiteLink = document.querySelector('#body-company-link-button');
    if (websiteLink) {
      const url = company.Website || company['Website Short'] || '#';
      websiteLink.href = url;
      try {
        const displayUrl = company['Website Short'] || company.Website || '';
        setText(websiteLink.querySelector('.text-block.link'), displayUrl && displayUrl !== '#' ? new URL(displayUrl).hostname.replace(/^www\./, '') : '');
      } catch {
        setText(websiteLink.querySelector('.text-block.link'), company['Website Short'] || url);
      }
    }

    setTimePeriod('Tenure', company['Start Date'], company['End Date']);
    setMetatagByLabel('Type', company['Company Type']);
    setMetatagByLabel('Industry', company.Industry);
    setFundingMetatag(company['Recent Funding'], company['Recent Stage']);
    setHeadcountMetatag(company['Headcount at Start'], company['Headcount at End']);
    setFoundedMetatag(company['Founding Year']);

    const hasFunding = formatFunding(company['Recent Funding']) || (company['Recent Stage'] && String(company['Recent Stage']).trim());
    const hasHeadcount = (company['Headcount at Start'] !== '' && company['Headcount at Start'] != null) || (company['Headcount at End'] !== '' && company['Headcount at End'] != null);
    hideMetatagIfEmpty('Tenure', company['Start Date'] || company['End Date']);
    hideMetatagIfEmpty('Type', company['Company Type']);
    hideMetatagIfEmpty('Funding', hasFunding);
    hideMetatagIfEmpty('Headcount', hasHeadcount);
    hideMetatagIfEmpty('Industry', company.Industry);
    hideMetatagIfEmpty('Founded', company['Founding Year']);

    setHtml(document.querySelector('.portfolio-header-content-left + .w-richtext, .w-dyn-bind-empty.w-richtext'), company.Highlights || '');

    // Products list in company (first work-component)
    const workComponents = document.querySelectorAll('.work-component');
    const productsSection = workComponents[0]?.closest('.padding-section-medium');
    const patentsSection = workComponents[1]?.closest('.padding-section-medium');
    if (productsSection) productsSection.style.display = companyProducts.length ? '' : 'none';
    if (patentsSection) patentsSection.style.display = companyPatents.length ? '' : 'none';
    if (workComponents.length >= 1 && companyProducts.length) {
      const list = workComponents[0].querySelector('.w-dyn-items');
      const template = list?.querySelector('.w-dyn-item');
      if (template && list) {
        list.innerHTML = '';
        list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        companyProducts.forEach(p => {
          const clone = template.cloneNode(true);
          const workItem = clone.querySelector('.work-item');
          const dateEls = workItem?.querySelectorAll('.portfolio-date');
          const dateText = p['End Date'] ? formatEndDateShort(p['End Date']) : 'In Progress';
          setText(workItem?.querySelector('.products'), p.Name);
          setText(workItem?.querySelector('.text-size-medium'), p['50 Character Description'] || p.Summary);
          if (dateEls?.[0]) setText(dateEls[0], dateText);
          if (dateEls?.[1]) dateEls[1].style.display = 'none';
          const link = clone.querySelector('a.work-link');
          if (link) link.href = `/products/${p.Slug}`;
          setImgSrc(workItem?.querySelector('.product-list-thumbnail-image'), p['Thumbnai Image'] || p['Project Image']);
          list.appendChild(clone);
        });
      }
    }
    // Patents list in company (second work-component)
    if (workComponents.length >= 2 && companyPatents.length) {
      const list = workComponents[1].querySelector('.w-dyn-items');
      const template = list?.querySelector('.w-dyn-item');
      if (template && list) {
        list.innerHTML = '';
        list.closest('.w-dyn-list')?.querySelector('.w-dyn-empty')?.style.setProperty('display', 'none');
        companyPatents.forEach(p => {
          const clone = template.cloneNode(true);
          const workItem = clone.querySelector('.work-item');
          const dateEls = workItem?.querySelectorAll('.portfolio-date');
          const endDate = p['Patented Date'] || p['End Date'];
          const dateText = endDate ? formatEndDateShort(endDate) : 'In Progress';
          setText(workItem?.querySelector('.products'), p.Name);
          setText(workItem?.querySelector('.text-size-medium'), p['50 Character Description'] || p.Summary);
          if (dateEls?.[0]) setText(dateEls[0], dateText);
          if (dateEls?.[1]) dateEls[1].style.display = 'none';
          const link = clone.querySelector('a.work-link');
          if (link) link.href = p['Google Patent URL'] || `/patents/${p.Slug}`;
          setImgSrc(workItem?.querySelector('.product-list-thumbnail-image'), p['Thumbnai Image'] || p['Project Image']);
          list.appendChild(clone);
        });
      }
    }
  }

  // --- DETAIL PATENT PAGE ---
  async function renderDetailPatent(patent) {
    setText(document.querySelector('.portfolio-header-content-left h1'), patent.Name);
    setText(document.querySelector('.portfolio-header-content-left h4'), patent['Startup Company'] || '');
    setText(document.querySelector('.portfolio-header-content-left .text-size-medium'), patent['50 Character Description'] || patent.Summary);
    setImgSrc(document.querySelector('.hero-image'), patent['Project Image'] || patent['Thumbnai Image']);
    setHtml(document.querySelector('.w-dyn-bind-empty.w-richtext'), patent.Description || patent.Abstract || '');
    const patentDate = patent['Patented Date'] || patent['End Date'];
    setTimePeriod('Time Period', patent['Start Date'], patentDate);
  }

  // --- DETAIL SKILL PAGE ---
  async function renderDetailSkill(skill) {
    setText(document.querySelector('h2.w-dyn-bind-empty'), skill.Name);
    setHtml(document.querySelector('.w-dyn-bind-empty.w-richtext'), skill.Description || '');
  }

  // --- MAIN ---
  async function init() {
    const pageType = getPageType();
    if (!pageType) return;

    try {
      let products, companies, patents, skills, tags, productImages;

      if (['index', 'products', 'detail_product', 'detail_company'].includes(pageType)) {
        products = await fetchJSON('products.json');
      }
      if (['index', 'companies', 'detail_company', 'detail_product'].includes(pageType)) {
        companies = await fetchJSON('companies.json');
      }
      if (['patents', 'detail_patent', 'detail_company'].includes(pageType)) {
        patents = await fetchJSON('patents.json');
      }
      if (['index', 'detail_skill', 'detail_product', 'detail_company'].includes(pageType)) {
        skills = await fetchJSON('skills.json');
      }
      if (pageType === 'detail_product') {
        productImages = await fetchJSON('product-images.json');
      }

      switch (pageType) {
        case 'index':
          await renderIndex({ products, companies, skills });
          break;
        case 'products':
          await renderProductsList(products);
          break;
        case 'companies':
          await renderCompaniesList(companies);
          break;
        case 'patents':
          await renderPatentsList(patents);
          break;
        case 'detail_product': {
          const slug = getSlug();
          const product = products.find(p => p.Slug === slug);
          if (product) await renderDetailProduct(product, companies, productImages, skills);
          break;
        }
        case 'detail_company': {
          const slug = getSlug();
          const company = companies.find(c => c.Slug === slug);
          if (company) await renderDetailCompany(company, products, patents, skills);
          break;
        }
        case 'detail_patent': {
          const slug = getSlug();
          const patent = patents.find(p => p.Slug === slug);
          if (patent) await renderDetailPatent(patent);
          break;
        }
        case 'detail_skill': {
          const slug = getSlug();
          const skill = skills.find(s => s.Slug === slug);
          if (skill) await renderDetailSkill(skill);
          break;
        }
      }
    } catch (err) {
      console.warn('CMS Data Loader:', err.message);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
