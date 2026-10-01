// Product photo auto-fallback: pages reference the photo filename we agreed on
// even before it exists. If the file isn't uploaded yet, the browser's built-in
// image error fires and we swap in the usual "Photo Coming Soon" placeholder.
// The moment the correctly-named file is added to Images/products/, the <img>
// loads successfully and the real photo shows up automatically — no HTML edit needed.
function handleProductImageError(img, placeholderClass) {
    img.onerror = null;
    const placeholder = document.createElement("div");
    placeholder.className = placeholderClass;
    placeholder.textContent = "Photo Coming Soon";
    img.replaceWith(placeholder);
}

// Contact form: submits to Netlify Forms (works once the site is deployed on
// Netlify with the matching hidden "form-name" field above — see contact.html).
// Harmless no-op locally / on any other host; nothing breaks either way.
const contactForm = document.getElementById("contactForm");

if (contactForm) {
    const encodeFormData = (data) =>
        Object.keys(data)
            .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
            .join("&");

    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const status = document.getElementById("contactFormStatus");
        const data = Object.fromEntries(new FormData(contactForm).entries());

        fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeFormData(data),
        })
            .then(() => {
                contactForm.reset();
                contactForm.hidden = true;
                if (status) {
                    status.hidden = false;
                    status.textContent = "Thanks! Your message has been sent — we'll get back to you soon.";
                }
            })
            .catch(() => {
                if (status) {
                    status.hidden = false;
                    status.textContent = "Something went wrong sending your message. Please try WhatsApp or email us directly.";
                }
            });
    });
}

const heroSlides = document.querySelectorAll(".hero-slide");
const heroDots = document.querySelectorAll(".slider-dots .dot");

let currentSlide = 0;

function showSlide(index) {
    heroSlides.forEach((slide, i) => slide.classList.toggle("active-slide", i === index));
    heroDots.forEach((dot, i) => dot.classList.toggle("active-dot", i === index));
    currentSlide = index;
}

function nextSlide() {
    showSlide((currentSlide + 1) % heroSlides.length);
}

heroDots.forEach((dot, i) => {
    dot.addEventListener("click", () => showSlide(i));
});

if (heroSlides.length > 1) {
    setInterval(nextSlide, 4000);
}

const revealEls = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.15 });

revealEls.forEach((el) => revealObserver.observe(el));

const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector("header nav");

navToggle?.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("nav-open");
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
});

function isMobileNav() {
    return !!navToggle && getComputedStyle(navToggle).display !== "none";
}

// Mobile accordion (PRODUCTS panel, and each category inside it): a plain
// show/hide, no animation. Earlier this animated open by measuring the
// real content height in JS — first directly, then deferred a frame, then
// replaced with one fixed generous height — and it still showed up blank
// on the reporting device each time. CSS now does the showing/hiding
// entirely by itself (display:none/block on the .menu-open/.cat-open
// classes) — these functions just flip the classes.
function setCategoryOpen(col, open) {
    col.classList.toggle("cat-open", open);
}

function setMenuOpen(item, menu, arrow, open) {
    item.classList.toggle("menu-open", open);
    arrow?.setAttribute("aria-expanded", String(open));

    if (!open) {
        menu.querySelectorAll(".mega-menu-col.cat-open").forEach((col) => setCategoryOpen(col, false));
    }
}

siteNav?.querySelectorAll(".nav-item").forEach((item) => {
    const arrow = item.querySelector(":scope > a .dropdown-arrow");
    const menu = item.querySelector(":scope > .dropdown-menu");

    arrow?.addEventListener("click", (e) => {
        if (!isMobileNav()) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(item, menu, arrow, !item.classList.contains("menu-open"));
    });

    menu?.querySelectorAll(".mega-menu-heading").forEach((heading) => {
        heading.addEventListener("click", (e) => {
            if (!isMobileNav()) {
                return;
            }
            e.preventDefault();
            e.stopImmediatePropagation();
            const col = heading.closest(".mega-menu-col");
            if (col) {
                setCategoryOpen(col, !col.classList.contains("cat-open"));
            }
        });
    });
});

siteNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
        siteNav.classList.remove("nav-open");
        navToggle?.classList.remove("open");
        navToggle?.setAttribute("aria-expanded", "false");
        siteNav.querySelectorAll(".nav-item.menu-open").forEach((item) => {
            item.classList.remove("menu-open");
        });
        siteNav.querySelectorAll(".mega-menu-col.cat-open").forEach((col) => setCategoryOpen(col, false));
    });
});

const siteHeader = document.querySelector("header");

function handleHeaderShrink() {
    siteHeader.classList.toggle("shrink", window.scrollY > 40);
}

// Run at most once per animation frame, and mark the listener passive, so
// this never competes with the browser's own scroll handling and can't be
// the thing making the page feel like it "sticks" while scrolling.
let headerShrinkTicking = false;

window.addEventListener("scroll", () => {
    if (headerShrinkTicking) {
        return;
    }
    headerShrinkTicking = true;
    requestAnimationFrame(() => {
        handleHeaderShrink();
        headerShrinkTicking = false;
    });
}, { passive: true });

handleHeaderShrink();

// About page hero: the fixed photo behind the heading/text/cards zooms out
// as the visitor scrolls through that section, easing back to normal size.
// Written the same rAF-throttled, passive way as the header shrink above —
// a scroll listener doing real work on every tick is what caused the
// "gets stuck while scrolling" bug fixed earlier.
const aboutHeroBg = document.getElementById("aboutHeroBg");
const aboutHero = document.querySelector(".about-hero");
const aboutFloatingNav = document.getElementById("aboutFloatingNav");

if (aboutHeroBg && aboutHero) {
    let aboutHeroHeight = aboutHero.offsetHeight;

    window.addEventListener("resize", () => {
        aboutHeroHeight = aboutHero.offsetHeight;
    });

    // The scroll listener only computes *where the zoom should end up*
    // (cheap: no DOM writes). A separate, continuously-running loop eases
    // the on-screen scale toward that target a little closer every frame,
    // instead of snapping straight to it — that's what makes it read as a
    // smooth, lagging drift rather than a value ticking in step with the
    // scroll wheel. The loop only ever writes `transform`, so — like the
    // customers marquee — it stays cheap enough to run forever.
    let targetScale = 1.18;
    let currentScale = 1.18;
    const smoothing = 0.06;

    // On this page the header slides away on scroll and the floating
    // Home/Products buttons take its place — computed in the same scroll
    // handler as the zoom above so there's only one listener, not two.
    function updateAboutHeaderVisibility() {
        const scrolled = window.scrollY > 40;
        siteHeader.classList.toggle("header-hidden", scrolled);
        aboutFloatingNav?.classList.toggle("show", scrolled);
    }

    function computeTargetScale() {
        const raw = Math.min(window.scrollY / aboutHeroHeight, 1);
        const eased = 1 - Math.pow(1 - raw, 2);
        targetScale = 1.18 - (0.18 * eased);
        updateAboutHeaderVisibility();
    }

    function followZoom() {
        currentScale += (targetScale - currentScale) * smoothing;
        aboutHeroBg.style.transform = `scale(${currentScale})`;
        requestAnimationFrame(followZoom);
    }

    window.addEventListener("scroll", computeTargetScale, { passive: true });
    updateAboutHeaderVisibility();

    computeTargetScale();
    requestAnimationFrame(followZoom);
}

const categoryLinks = document.querySelectorAll(".catalog-categories a");
const catalogPanels = document.querySelectorAll(".catalog-panel");

function activateCategory(link) {
    if (!link) {
        return;
    }

    categoryLinks.forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    // On phones the categories are a horizontal slider: keep the chosen pill in view
    const strip = link.parentElement;
    if (strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({
            left: link.offsetLeft - (strip.clientWidth - link.offsetWidth) / 2,
            behavior: "smooth"
        });
    }

    if (!catalogPanels.length) {
        return;
    }

    const targetId = link.dataset.category ? `panel-${link.dataset.category}` : "panel-default";
    catalogPanels.forEach((panel) => {
        panel.hidden = panel.id !== targetId;
    });

    if (targetId === "panel-empty") {
        const heading = document.getElementById("panel-empty-heading");
        if (heading) {
            heading.textContent = link.textContent.trim().toUpperCase();
        }
    }
}

categoryLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        activateCategory(link);
    });
});

const requestedCategory = new URLSearchParams(window.location.search).get("category");

if (requestedCategory && categoryLinks.length) {
    const normalized = requestedCategory.trim().toLowerCase();
    const matchedLink = Array.from(categoryLinks).find(
        (link) => link.textContent.trim().toLowerCase() === normalized
    );
    if (matchedLink) {
        activateCategory(matchedLink);
    }
}

const marqueeTrack = document.querySelector(".customer-track");

if (marqueeTrack) {
    let offset = 0;
    const speed = 0.85;

    // scrollWidth forces the browser to recalculate layout before it can
    // answer, so reading it every single animation frame (60+ times a
    // second, forever) is expensive enough to stutter scrolling on its
    // own. Measure it once, and only re-measure when it can actually
    // change (images finishing their load, or the window resizing).
    let halfWidth = marqueeTrack.scrollWidth / 2;
    const remeasure = () => { halfWidth = marqueeTrack.scrollWidth / 2; };

    window.addEventListener("load", remeasure);
    let resizeTimer;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(remeasure, 200);
    });

    function autoScrollMarquee() {
        offset += speed;
        if (offset >= halfWidth) {
            offset -= halfWidth;
        }
        marqueeTrack.style.transform = `translateX(-${offset}px)`;
        requestAnimationFrame(autoScrollMarquee);
    }

    requestAnimationFrame(autoScrollMarquee);

    const arrowLeft = document.querySelector(".marquee-arrow-left");
    const arrowRight = document.querySelector(".marquee-arrow-right");

    arrowLeft?.addEventListener("click", () => {
        offset -= 350;
        if (offset < 0) {
            offset += halfWidth;
        }
    });

    arrowRight?.addEventListener("click", () => {
        offset += 350;
        if (offset >= halfWidth) {
            offset -= halfWidth;
        }
    });
}

// Coverflow: one active card centered, the rest positioned by their distance
// from it (-2..2, or "hidden" beyond that), each distance styled in CSS via
// the data-pos attribute this sets.
const coverflowStage = document.querySelector(".coverflow-stage");

if (coverflowStage) {
    const cards = Array.from(coverflowStage.querySelectorAll(".coverflow-card"));
    const caption = document.querySelector(".coverflow-caption");
    const arrowLeft = document.querySelector(".coverflow-arrow-left");
    const arrowRight = document.querySelector(".coverflow-arrow-right");
    let active = 0;

    function render() {
        cards.forEach((card, i) => {
            let distance = i - active;
            // Wrap around so the set feels continuous in both directions
            if (distance > cards.length / 2) {
                distance -= cards.length;
            } else if (distance < -cards.length / 2) {
                distance += cards.length;
            }
            card.dataset.pos = Math.abs(distance) > 2 ? "hidden" : String(distance);
        });
        if (caption) {
            caption.textContent = cards[active].dataset.name || "";
        }
    }

    function setActive(index) {
        active = (index + cards.length) % cards.length;
        render();
    }

    cards.forEach((card, i) => {
        card.addEventListener("click", (e) => {
            if (i !== active) {
                e.preventDefault();
                setActive(i);
            }
            // Otherwise it's the centered card — let the link navigate normally.
        });
    });

    arrowLeft?.addEventListener("click", () => setActive(active - 1));
    arrowRight?.addEventListener("click", () => setActive(active + 1));

    render();
}

document.querySelectorAll(".product-gallery").forEach((gallery) => {
    const mainImg = gallery.querySelector(".product-gallery-main > img");
    const prevBtn = gallery.querySelector(".gallery-prev");
    const nextBtn = gallery.querySelector(".gallery-next");
    const thumbsWrap = gallery.querySelector(".product-gallery-thumbs");
    const sources = gallery.dataset.gallery.split(",").map((s) => s.trim()).filter(Boolean);

    const loadable = sources.map((src) => new Promise((resolve) => {
        const probe = new Image();
        probe.onload = () => resolve({ src, ratio: probe.naturalWidth / probe.naturalHeight });
        probe.onerror = () => resolve(null);
        probe.src = src;
    }));

    Promise.all(loadable).then((results) => {
        const loaded = results.filter(Boolean);
        const images = loaded.map((r) => r.src);
        if (loaded.length) {
            mainImg.style.aspectRatio = String(loaded[0].ratio);
        }
        if (images.length < 2) {
            return;
        }

        let current = Math.max(images.indexOf(mainImg.getAttribute("src")), 0);
        const thumbs = images.map((src, i) => {
            const thumb = document.createElement("button");
            thumb.type = "button";
            thumb.className = "gallery-thumb";
            thumb.setAttribute("aria-label", `Show image ${i + 1}`);
            thumb.innerHTML = `<img src="${src}" alt="">`;
            thumb.addEventListener("click", () => show(i));
            thumbsWrap.appendChild(thumb);
            return thumb;
        });

        function show(index) {
            current = (index + images.length) % images.length;
            mainImg.src = images[current];
            thumbs.forEach((t, i) => t.classList.toggle("active", i === current));
        }

        prevBtn.addEventListener("click", () => show(current - 1));
        nextBtn.addEventListener("click", () => show(current + 1));

        prevBtn.hidden = false;
        nextBtn.hidden = false;
        thumbsWrap.hidden = false;
        show(current);
    });
});

const zoomableImages = document.querySelectorAll(".product-detail-image > img, .product-gallery-main > img");

if (zoomableImages.length) {
    const overlay = document.createElement("div");
    overlay.className = "image-zoom-overlay";
    overlay.innerHTML = `
        <div class="image-zoom-overlay-inner">
            <button type="button" class="image-zoom-close" aria-label="Close zoom">&times;</button>
            <img alt="">
        </div>
        <p class="image-zoom-hint">Click image to zoom in &middot; move mouse to inspect &middot; click again to reset</p>
    `;
    document.body.appendChild(overlay);

    const zoomInner = overlay.querySelector(".image-zoom-overlay-inner");
    const zoomImg = overlay.querySelector("img");
    const zoomClose = overlay.querySelector(".image-zoom-close");

    function openZoom(img) {
        zoomImg.src = img.currentSrc || img.src;
        zoomImg.alt = img.alt || "";
        zoomInner.classList.remove("zoomed");
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeZoom() {
        overlay.classList.remove("open");
        zoomInner.classList.remove("zoomed");
        document.body.style.overflow = "";
    }

    zoomableImages.forEach((img) => {
        img.addEventListener("click", () => openZoom(img));
    });

    zoomInner.addEventListener("click", (e) => {
        if (e.target === zoomClose) {
            return;
        }
        zoomInner.classList.toggle("zoomed");
    });

    zoomInner.addEventListener("mousemove", (e) => {
        if (!zoomInner.classList.contains("zoomed")) {
            return;
        }
        const rect = zoomInner.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        zoomImg.style.transformOrigin = `${xPercent}% ${yPercent}%`;
    });

    zoomClose.addEventListener("click", closeZoom);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            closeZoom();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) {
            closeZoom();
        }
    });
}

// Nav search: click the icon to extend it into a bar; it only ever lists products.
const PRODUCT_INDEX = [
    { name: "Curaflo", href: "product-curaflo.html" },
    { name: "Curaflo Plus", href: "product-curaflo-plus.html" },
    { name: "Curaflo Prime", href: "product-curaflo-prime.html" },
    { name: "Curaflo Urine Bag", href: "product-curaflo-urine-bag.html" },
    { name: "Curaflo Plus Urine Bag", href: "product-curaflo-plus-urine-bag.html" },
    { name: "Curasafe", href: "product-curasafe.html" },
    { name: "Curapro (Surgical Gloves)", href: "product-curapro.html" },
    { name: "HandsCure Latex Examination Gloves Powdered", href: "product-handscure-latex-examination-gloves-powdered.html" },
    { name: "HandsCure Latex Examination Gloves Powder Free", href: "product-handscure-latex-examination-gloves-powder-free.html" },
    { name: "Curacan Open IV Cannula (Pen Type)", href: "product-open-iv-cannula-pen-type.html" },
    { name: "Curacan Open IV Cannula (Wing Type)", href: "product-open-iv-cannula-wing-type.html" },
    { name: "Curacan Open IV Cannula (Port Type)", href: "product-open-iv-cannula-port-type.html" },
    { name: "Curacan Safety Open IV Cannula (Pen Type)", href: "product-safety-open-iv-cannula-pen-type.html" },
    { name: "Curacan Safety Open IV Cannula (Wing Type)", href: "product-safety-open-iv-cannula-wing-type.html" },
    { name: "Curacan Safety Open IV Cannula (Port Type)", href: "product-safety-open-iv-cannula-port-type.html" },
    { name: "Curacare Oxygen Mask", href: "product-curacare-oxygen-mask.html" },
    { name: "Curacare Nelaton Catheter", href: "product-curacare-nelaton-catheter.html" },
    { name: "Curacare Non-Rebreathing Oxygen Mask", href: "product-curacare-non-rebreathing-oxygen-mask.html" },
    { name: "Curacare Oropharyngeal Airways", href: "product-curacare-oropharyngeal-airways.html" },
    { name: "Curacare Suction Catheters", href: "product-curacare-suction-catheters.html" },
    { name: "Curacare Feeding Tube", href: "product-curacare-feeding-tube.html" },
    { name: "Curacare Multi-Venturi Mask", href: "product-curacare-multi-venturi-mask.html" },
    { name: "Curacare Endotracheal Tube", href: "product-curacare-endotracheal-tube.html" },
    { name: "Curacare Nasal Oxygen Cannula", href: "product-curacare-nasal-oxygen-cannula.html" },
    { name: "Curacare Nebulizer with Aerosol Mask", href: "product-curacare-nebulizer-aerosol-mask.html" },
    { name: "Curacare Air Cushion Mask", href: "product-curacare-air-cushion-mask.html" },
    { name: "Curaloc Sterilization Flat Roll", href: "product-curaloc-sterilization-flat-roll.html" },
    { name: "Curaloc Self-Sealing Sterilization Pouch", href: "product-curaloc-self-sealing-sterilization-pouch.html" },
    { name: "Curaloc Gusseted Heat Sealing Sterilization Pouch", href: "product-curaloc-gusseted-heat-sealing-sterilization-pouch.html" },
    { name: "Curaloc Sterilization Wrapping Crepe Paper", href: "product-curaloc-sterilization-wrapping-crepe-paper.html" }
];

document.querySelectorAll(".nav-search").forEach((wrap) => {
    const icon = wrap.querySelector(".nav-search-icon");
    const input = wrap.querySelector(".nav-search-input");
    const results = wrap.querySelector(".nav-search-results");

    function renderResults(items) {
        if (!items.length) {
            results.innerHTML = '<div class="nav-search-empty">No matching products</div>';
            return;
        }
        results.innerHTML = items.map((p) => `<a href="${p.href}">${p.name}</a>`).join("");
    }

    function runSearch() {
        const q = input.value.trim().toLowerCase();
        const matches = q
            ? PRODUCT_INDEX.filter((p) => p.name.toLowerCase().includes(q))
            : PRODUCT_INDEX;
        renderResults(matches);
        results.classList.add("show");
    }

    function openSearch() {
        wrap.classList.add("open");
        icon.setAttribute("aria-expanded", "true");
        renderResults(PRODUCT_INDEX);
        results.classList.add("show");
        input.focus();
    }

    function closeSearch() {
        wrap.classList.remove("open");
        icon.setAttribute("aria-expanded", "false");
        results.classList.remove("show");
        input.value = "";
    }

    icon.addEventListener("click", (e) => {
        e.preventDefault();
        if (wrap.classList.contains("open")) {
            closeSearch();
        } else {
            openSearch();
        }
    });

    input.addEventListener("input", runSearch);

    document.addEventListener("click", (e) => {
        if (wrap.classList.contains("open") && !wrap.contains(e.target)) {
            closeSearch();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && wrap.classList.contains("open")) {
            closeSearch();
            icon.focus();
        }
    });
});

document.querySelectorAll(".product-variant-options").forEach((group) => {
    const options = group.querySelectorAll(".variant-option");
    const container = group.closest(".product-detail-info") || document;
    options.forEach((option) => {
        option.addEventListener("click", () => {
            options.forEach((o) => o.classList.remove("active"));
            option.classList.add("active");

            const variant = option.dataset.variant;
            if (variant) {
                container.querySelectorAll("[data-variant-features]").forEach((list) => {
                    list.hidden = list.dataset.variantFeatures !== variant;
                });
            }
        });
    });
});
