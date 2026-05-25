// 循鑫（天津）再生资源有限公司企业落地页主JavaScript文件

// 全局变量
const XunXin = {
    // 配置项
    config: {
        navbarScrollOffset: 100,
        animationDuration: 800,
        contactPhone: '13552063322',
        contactEmail: 'xunxin2025@126.com',
        mapConfig: {
            center: [100.0, 35.0], // 全国中心坐标
            zoom: 5
        }
    },

    // 初始化函数
    init: function() {
        this.initAOS();
        this.initNavbar();
        this.initSectionHighlight(); // 激活板块高亮
        this.initSmoothScroll();
        this.initLazyLoading();
        this.initBackToTop();
        this.initHeroParticles(); // 初始化粒子效果
        this.loadDynamicInsights(); // 加载后台发布的文章
    },

    // 从 /api/articles 加载后台发布的文章并插入行业洞察
    loadDynamicInsights: function() {
        const row = document.getElementById('insightsRow');
        if (!row) return;
        fetch('/api/articles', { credentials: 'same-origin' })
            .then(function(res) { return res.ok ? res.json() : null; })
            .then(function(data) {
                if (!data || !Array.isArray(data.articles) || data.articles.length === 0) return;
                const frag = document.createDocumentFragment();
                data.articles.forEach(function(a, idx) {
                    const col = document.createElement('div');
                    col.className = 'col-lg-3 col-md-6';
                    col.setAttribute('data-aos', 'fade-up');
                    col.setAttribute('data-aos-delay', String(50 + idx * 50));
                    col.innerHTML = XunXin.renderInsightCard(a);
                    frag.appendChild(col);
                });
                row.insertBefore(frag, row.firstChild);
                if (typeof AOS !== 'undefined' && AOS.refresh) AOS.refresh();
            })
            .catch(function() { /* silent: degrade gracefully */ });
    },

    renderInsightCard: function(a) {
        const safe = function(s) {
            return String(s == null ? '' : s)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        };
        const title = safe(a.title);
        const coverRaw = a.coverImage || 'assets/images/business/metal-recycling-1.webp';
        const cover = safe(coverRaw.startsWith('/') ? coverRaw : '/' + coverRaw);
        const category = safe(a.category || '行业洞察');
        const categoryColor = safe(a.categoryColor || 'bg-secondary');
        const date = safe((a.publishedAt || '').slice(0, 10));
        const minutes = Number(a.readMinutes) || 6;
        const subtitle = safe(a.subtitle || a.metaDescription || '');
        const slug = safe(a.slug);
        return ''
            + '<article class="card insight-card h-100">'
            + '  <div class="insight-cover">'
            + '    <img src="' + cover + '" alt="' + title + '" loading="lazy">'
            + '    <span class="insight-badge ' + categoryColor + '">' + category + '</span>'
            + '  </div>'
            + '  <div class="card-body d-flex flex-column">'
            + '    <div class="insight-meta text-muted small mb-2">'
            + '      <span><i class="far fa-calendar-alt me-1"></i>' + date + '</span>'
            + '      <span class="ms-3"><i class="far fa-clock me-1"></i>' + minutes + ' 分钟阅读</span>'
            + '    </div>'
            + '    <h5 class="card-title">'
            + '      <a href="/post/' + slug + '" class="stretched-link text-decoration-none text-dark">' + title + '</a>'
            + '    </h5>'
            + (subtitle ? '<p class="card-text text-muted small mt-2">' + subtitle + '</p>' : '')
            + '  </div>'
            + '</article>';
    },
    
    // 初始化AOS动画
    initAOS: function() {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: this.config.animationDuration,
                once: true,
                offset: 50,
                easing: 'ease-out-cubic'
            });
        }
    },
    
    // 导航栏滚动效果
    initNavbar: function() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;
        
        const handleScroll = () => {
            if (window.scrollY > this.config.navbarScrollOffset) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        };
        
        // 防抖处理
        let scrollTimer = null;
        window.addEventListener('scroll', () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(handleScroll, 10);
        });
        
        // 初始检查
        handleScroll();
    },
    
    // 平滑滚动
    initSmoothScroll: function() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    const offsetTop = targetElement.offsetTop - 80; // 导航栏高度补偿
                    
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                    
                    // 移动端关闭菜单
                    const navbarCollapse = document.querySelector('.navbar-collapse');
                    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
                        const navbarToggler = document.querySelector('.navbar-toggler');
                        if (navbarToggler) navbarToggler.click();
                    }
                }
            });
        });
    },

    // 导航栏 - 高亮当前页面板块（Scrollspy-like）
    initSectionHighlight: function() {
        const navLinks = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
        const sections = Array.from(document.querySelectorAll('section[id]'));
        if (!navLinks.length || !sections.length) return;

        const updateActive = () => {
            const scrollPos = window.scrollY + 90; // 补偿导航栏高度
            let currentSection = sections[0];

            for (const sec of sections) {
                if (sec.offsetTop <= scrollPos) {
                    currentSection = sec;
                }
            }

            navLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) return;
                const isActive = href === `#${currentSection.id}`;
                link.classList.toggle('active', isActive);
            });
        };

        window.addEventListener('scroll', this.throttle(updateActive, 120));
        // 初始执行
        updateActive();

        // 点击时微小延迟后确保高亮正确
        navLinks.forEach(link => {
            link.addEventListener('click', () => setTimeout(() => updateActive(), 300));
        });
    },
    
    // 显示提示信息
    showAlert: function(type, message) {
        const alertContainer = document.getElementById('alertContainer') || this.createAlertContainer();
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        // 自动消失
        setTimeout(() => {
            if (alert.parentNode) {
                alert.classList.remove('show');
                setTimeout(() => alert.remove(), 150);
            }
        }, 5000);
    },
    
    // 创建提示容器
    createAlertContainer: function() {
        const container = document.createElement('div');
        container.id = 'alertContainer';
        container.className = 'alert-container position-fixed';
        container.style.cssText = 'top: 100px; right: 20px; z-index: 9999; max-width: 400px;';
        document.body.appendChild(container);
        return container;
    },
    
    // 懒加载处理
    initLazyLoading: function() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    },
    
    // 工具函数：节流
    throttle: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // 工具函数：防抖
    debounce: function(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },
    
    // 拨打电话
    callPhone: function(number) {
        if (number) {
            window.location.href = `tel:${number}`;
        }
    },
    
    // 复制到剪贴板
    copyToClipboard: function(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showAlert('success', '已复制到剪贴板');
            });
        } else {
            // 降级方案
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showAlert('success', '已复制到剪贴板');
        }
    },
    
    // 返回顶部功能
    initBackToTop: function() {
        const backToTopBtn = document.getElementById('backToTop');
        if (!backToTopBtn) return;
        
        const showButton = () => {
            if (window.scrollY > 300) {
                backToTopBtn.style.display = 'flex';
            } else {
                backToTopBtn.style.display = 'none';
            }
        };
        
        // 防抖处理
        let scrollTimer = null;
        window.addEventListener('scroll', () => {
            if (scrollTimer) clearTimeout(scrollTimer);
            scrollTimer = setTimeout(showButton, 10);
        });
        
        // 点击返回顶部
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        // 初始检查
        showButton();
    },
    
    // 初始化英雄横幅粒子效果
    initHeroParticles: function() {
        const particlesContainer = document.querySelector('.hero-particles');
        if (!particlesContainer) return;
        
        // 创建粒子
        const particleCount = 30;
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.cssText = `
                position: absolute;
                width: ${Math.random() * 5 + 2}px;
                height: ${Math.random() * 5 + 2}px;
                background: rgba(255, 255, 255, ${Math.random() * 0.5 + 0.3});
                border-radius: 50%;
                top: ${Math.random() * 100}%;
                left: ${Math.random() * 100}%;
                animation: float ${Math.random() * 10 + 10}s infinite ease-in-out;
                animation-delay: ${Math.random() * 5}s;
            `;
            particlesContainer.appendChild(particle);
        }
        
        // 添加CSS动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                0%, 100% {
                    transform: translate(0, 0) rotate(0deg);
                }
                25% {
                    transform: translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px) rotate(90deg);
                }
                50% {
                    transform: translate(${Math.random() * 30 - 15}px, ${Math.random() * 30 - 15}px) rotate(180deg);
                }
                75% {
                    transform: translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px) rotate(270deg);
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    XunXin.init();
});

// 页面加载完成后的额外处理
window.addEventListener('load', () => {
    // 隐藏预加载器（如果有的话）
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => preloader.remove(), 300);
    }
    
    // 更新AOS
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
});

    // 导出到全局
window.XunXin = XunXin;