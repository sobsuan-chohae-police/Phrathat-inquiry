/**
 * ========================================================
 * THAI DATEPICKER CORE (Flatpickr) - Standalone Version
 * แก้ไขปัญหา: วันที่ 20 กลายเป็น 2569 และการ parse ISO วันที่ไม่เพี้ยน
 * ========================================================
 */

const ThaiDatePicker = {
    instances: {},

    /**
     * 1. ฟังก์ชันสร้างปฏิทิน
     */
    init: function(selector) {
        if (typeof flatpickr === 'undefined') {
            console.error("ThaiDatePicker: ไม่พบไลบรารี Flatpickr กรุณาติดตั้งก่อนเรียกใช้งาน");
            return;
        }

        this._injectCSS();

        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            if (el._flatpickr) return;

            const fp = flatpickr(el, {
                locale: "th",
                dateFormat: "j F Y",
                disableMobile: true,
                
                onReady: function(selectedDates, dateStr, instance) {
                    // ปุ่ม "วันนี้"
                    const btn = document.createElement('div');
                    btn.className = 'flatpickr-today-btn';
                    btn.innerHTML = 'วันนี้';
                    btn.addEventListener('click', () => { 
                        instance.setDate(new Date(), true); 
                        instance.close(); 
                    });
                    instance.calendarContainer.appendChild(btn);

                    // ปรับปีบนหัวปฏิทินให้เป็น พ.ศ.
                    if (instance.currentYearElement && !instance.currentYearElement.hasAttribute('data-patched')) {
                        instance.currentYearElement.setAttribute('data-patched', 'true');
                        
                        const originalSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                        const originalGet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get;
                        
                        Object.defineProperty(instance.currentYearElement, 'value', {
                            set: function(val) {
                                let year = parseInt(val, 10);
                                if (!isNaN(year) && year < 2400) { 
                                    year += 543; 
                                }
                                originalSet.call(this, year);
                            },
                            get: function() { 
                                return originalGet.call(this); 
                            }
                        });
                        instance.currentYearElement.value = instance.currentYear;
                    }
                },
                
                onYearChange: function(selectedDates, dateStr, instance) {
                    if (instance.currentYear > 2400) { 
                        instance.changeYear(instance.currentYear - 543); 
                    }
                },
                
                // [จุดแก้ไขที่ 1]: จัดรูปแบบข้อความเป็น พ.ศ. อย่างปลอดภัย โดยไม่ใช้ .replace() แบบเดิมที่ทำให้เลขวันโดนแทนที่
                formatDate: (date, format, locale) => {
                    const day = date.getDate();
                    const monthNames = [
                        "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                        "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
                    ];
                    const month = monthNames[date.getMonth()];
                    let thaiYear = date.getFullYear();
                    if (thaiYear < 2400) thaiYear += 543;
                    return `${day} ${month} ${thaiYear}`;
                }
            });

            // รองรับทั้ง ID ตรงๆ และ element
            let elId = el.id;
            if (!elId) {
                elId = 'dp_' + Math.random().toString(36).substr(2, 9);
                el.id = elId;
            }
            this.instances[elId] = fp;
            this.instances['#' + elId] = fp; // รองรับกรณีส่ง selector แบบมี #
        });
    },

    /**
     * 2. ฟังก์ชันดึงค่า ISO (YYYY-MM-DD)
     */
    getISODate: function(elementId) {
        const cleanId = elementId.replace('#', '');
        const fp = this.instances[cleanId] || this.instances[elementId];
        if (!fp || fp.selectedDates.length === 0) return ""; 
        
        const date = fp.selectedDates[0];
        const year = date.getFullYear(); 
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`; 
    },

    /**
     * 3. [จุดแก้ไขที่ 2]: ฟังก์ชัน setISODate ที่ Parse วันที่ใหม่อย่างแม่นยำ
     * ป้องกันการตกหล่นเป็น 20 มกราคม 2569
     */
    setISODate: function(elementId, isoDateStr) {
        const cleanId = elementId.replace('#', '');
        const fp = this.instances[cleanId] || this.instances[elementId];
        if (!fp || !isoDateStr) return;
        
        try {
            let str = String(isoDateStr).trim();
            // ตัด timezone ออก
            if (str.includes('T')) str = str.split('T')[0];

            let targetDate = null;

            // ตรวจจับรูปแบบ YYYY-MM-DD
            const isoMatch = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
            if (isoMatch) {
                let y = parseInt(isoMatch[1], 10);
                const m = parseInt(isoMatch[2], 10) - 1;
                const d = parseInt(isoMatch[3], 10);
                if (y > 2400) y -= 543; // ถ้าส่งมาเป็น พ.ศ. แปลงเป็น ค.ศ.
                targetDate = new Date(y, m, d, 12, 0, 0); // ตั้งเวลาเที่ยงวันเพื่อตัดปัญหา timezone
            } else {
                // กรณีมาเป็น Date object หรือสตริงอื่นๆ
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) {
                    let y = parsed.getFullYear();
                    if (y > 2400) y -= 543;
                    targetDate = new Date(y, parsed.getMonth(), parsed.getDate(), 12, 0, 0);
                }
            }

            if (targetDate && !isNaN(targetDate.getTime())) {
                fp.setDate(targetDate, true);
            }
        } catch (err) {
            console.error("ThaiDatePicker.setISODate error:", err);
        }
    },

    /**
     * 4. ล้างค่า
     */
    clear: function(elementId) {
        const cleanId = elementId.replace('#', '');
        const fp = this.instances[cleanId] || this.instances[elementId];
        if (fp) {
            fp.clear(); 
        }
    },

    /**
     * 5. ทำลายปฏิทิน
     */
    destroy: function(elementId) {
        const cleanId = elementId.replace('#', '');
        const fp = this.instances[cleanId] || this.instances[elementId];
        if (fp) {
            fp.destroy();
            delete this.instances[cleanId];
            delete this.instances['#' + cleanId];
        }
    },

    /**
     * 6. ฝัง CSS อัตโนมัติ
     */
    _injectCSS: function() {
        if (document.getElementById('thai-datepicker-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'thai-datepicker-styles';
        style.innerHTML = `
            .flatpickr-calendar { border-radius: 16px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; border: none !important; z-index: 99999 !important; }
            .flatpickr-day.selected { background: var(--navy-main, #1e293b) !important; border-color: var(--navy-main, #1e293b) !important; }
            .flatpickr-today-btn { text-align: center; padding: 12px; background: #f8fafc; cursor: pointer; font-family: 'Kanit', sans-serif; font-size: 0.95rem; color: var(--navy-main, #1e293b); border-top: 1px solid #e2e8f0; font-weight: 500; border-radius: 0 0 16px 16px; }
            .flatpickr-today-btn:hover { background: #f1f5f9; }

            span.flatpickr-weekday:nth-child(6) { color: #8b5cf6 !important; font-weight: 600; } 
            span.flatpickr-weekday:nth-child(7) { color: #ef4444 !important; font-weight: 600; } 

            .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay):not(.selected):nth-child(7n+6) { color: #8b5cf6; font-weight: 500; }
            .flatpickr-day:not(.prevMonthDay):not(.nextMonthDay):not(.selected):nth-child(7n+7) { color: #ef4444; font-weight: 500; }

            .flatpickr-day.prevMonthDay:nth-child(7n+6), .flatpickr-day.nextMonthDay:nth-child(7n+6) { color: rgba(139, 92, 246, 0.4); }
            .flatpickr-day.prevMonthDay:nth-child(7n+7), .flatpickr-day.nextMonthDay:nth-child(7n+7) { color: rgba(239, 68, 68, 0.4); }
            
            .flatpickr-day.selected:nth-child(7n+6), .flatpickr-day.selected:nth-child(7n+7) { color: #ffffff !important; }
        `;
        document.head.appendChild(style);
    }
};