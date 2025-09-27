// 循鑫再生资源企业落地页主JavaScript文件

// 全局变量
const XunXin = {
    // 配置项
    config: {
        navbarScrollOffset: 100,
        animationDuration: 800,
        contactFormEndpoint: '', // 后续配置
        phoneNumber: '', // 后续配置
        mapConfig: {
            center: [100.0, 35.0], // 全国中心坐标
            zoom: 5
        }
    },
    
    // 初始化函数
    init: function() {
        this.initAOS();
        this.initNavbar();
        this.initSmoothScroll();
        this.initContactForm();
        this.initLazyLoading();
        this.initBackToTop();
        this.initHeroParticles(); // 初始化粒子效果
        console.log('循鑫再生资源网站初始化完成');
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
    
    // 联系表单处理
    initContactForm: function() {
        const contactForm = document.getElementById('contactForm');
        if (!contactForm) return;
        
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // 使用原有的mailto方案
            submitContactForm();
        });
        
        // 实时验证
        const inputs = contactForm.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                if (input.classList.contains('is-invalid')) {
                    this.validateField(input);
                }
            });
        });
    },
    
    // Formspree 表单提交处理
    handleFormspreeSubmit: function(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        // 验证所有字段
        const isValid = this.validateForm(form);
        if (!isValid) return;
        
        // 显示提交状态
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>提交中...';
        
        // 获取表单数据
        const formData = new FormData(form);
        
        // 使用fetch提交到Formspree
        fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                this.showAlert('success', '提交成功！我们已收到您的咨询，会尽快与您联系。');
                form.reset();
                form.querySelectorAll('.is-valid').forEach(el => el.classList.remove('is-valid'));
            } else {
                response.json().then(data => {
                    if (Object.hasOwnProperty.call(data, 'errors')) {
                        this.showAlert('danger', '提交失败：' + data['errors'].map(error => error['message']).join(', '));
                    } else {
                        this.showAlert('danger', '提交失败，请稍后重试或直接致电联系我们。');
                    }
                });
            }
        })
        .catch(error => {
            console.error('提交错误:', error);
            this.showAlert('danger', '网络错误，请检查网络连接后重试。');
        })
        .finally(() => {
            // 恢复按钮状态
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    },
    
    // 表单验证
    validateForm: function(form) {
        const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        return isValid;
    },
    
    // 字段验证
    validateField: function(field) {
        const value = field.value.trim();
        const type = field.type;
        let isValid = true;
        let message = '';
        
        // 必填验证
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            message = '此字段为必填项';
        }
        
        // 特定类型验证
        if (value && type === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                message = '请输入有效的邮箱地址';
            }
        }
        
        if (value && type === 'tel') {
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                message = '请输入有效的手机号码';
            }
        }
        
        // 更新UI状态
        field.classList.remove('is-valid', 'is-invalid');
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        
        if (isValid) {
            field.classList.add('is-valid');
            if (feedback) feedback.textContent = '';
        } else {
            field.classList.add('is-invalid');
            if (feedback) feedback.textContent = message;
        }
        
        return isValid;
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

// 新的表单提交函数（使用mailto方案）
function submitContactForm() {
    console.log('submitContactForm called'); // 调试信息
    
    const name = document.getElementById('contactName').value;
    const phone = document.getElementById('contactPhone').value;
    const email = document.getElementById('contactEmail').value;
    const recycleType = document.getElementById('recycleType').value;
    const message = document.getElementById('contactMessage').value;
    
    console.log('Form data:', { name, phone, email, recycleType, message }); // 调试信息
    
    // 验证必填字段
    if (!name || !phone || !recycleType) {
        alert('请填写所有必填字段！');
        return;
    }
    
    // 构建邮件内容
    const subject = '循鑫再生资源 - 新的咨询表单';
    const body = `姓名：${name}
联系电话：${phone}
邮箱地址：${email || '未提供'}
回收类型：${recycleType}
详细描述：${message || '无'}

提交时间：${new Date().toLocaleString('zh-CN')}`;
    
    // 生成mailto链接
    const mailtoUrl = `mailto:xunxin2025@126.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // 显示提交确认对话框
    const confirmSubmit = confirm('您的咨询信息已准备就绪！\n\n点击「确定」将打开邮件客户端发送咨询\n点击「取消」查看其他联系方式\n\n咨询内容：\n' + 
        `姓名：${name}\n` +
        `电话：${phone}\n` +
        `回收类型：${recycleType}`);
    
    if (confirmSubmit) {
        try {
            // 尝试打开邮件客户端
            window.open(mailtoUrl, '_blank');
            
            // 延迟显示成功提示
            setTimeout(() => {
                alert('✅ 邮件客户端已打开！\n\n📧 请在邮件中点击"发送"完成提交\n📞 也可直接致电：131 1490 8387\n💬 或添加微信咨询（见下方二维码）');
            }, 500);
            
            // 清空表单
            document.getElementById('contactForm').reset();
            
        } catch (error) {
            console.error('邮件打开失败:', error);
            showAlternativeContact();
        }
    } else {
        // 用户选择查看其他联系方式
        showAlternativeContact();
    }
}

// 显示备选联系方式
function showAlternativeContact() {
    alert('📞 其他联系方式：\n\n' +
          '🔥 电话咨询：131 1490 8387\n' +
          '📧 邮箱联系：xunxin2025@126.com\n' +
          '💬 微信咨询：扫描页面二维码\n' +
          '🏢 公司地址：天津市武清开发区意安广场6号楼408室\n\n' +
          '⏰ 工作时间：8:00-18:00（全年无休）');
}