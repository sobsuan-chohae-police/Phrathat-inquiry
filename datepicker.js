/**
 * ========================================================
 * THAI DATEPICKER CORE (Flatpickr) - Standalone Version
 * รองรับภาษาไทย, ปี พ.ศ. แท้ (ไม่กระพริบ), ดึงค่าเป็น ISO ได้
 * พร้อมระบบ Inject CSS ในตัว (ไม่ต้องเขียน CSS แยก)
 * ========================================================
 */

const ThaiDatePicker = {
    // ตัวเก็บความจำว่าหน้าเว็บนี้มีปฏิทินกี่ตัว
    instances: {},

    /**
     * 1. ฟังก์ชันเสกปฏิทิน
     * วิธีใช้: ThaiDatePicker.init('.datepicker');
     */
    init: function(selector) {
        // [ปรับปรุง] เช็คว่าโปรเจกต์นี้มีการโหลด Flatpickr มาแล้วหรือยัง
        if (typeof flatpickr === 'undefined') {
            console.error("ThaiDatePicker: ไม่พบไลบรารี Flatpickr กรุณาติดตั้งก่อนเรียกใช้งาน");
            return;
        }

        // [ปรับปรุง] เรียกใช้ฟังก์ชันฝัง CSS อัตโนมัติ (ทำแค่ครั้งเดียว)
        this._injectCSS();

        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            // [ปรับปรุง] ป้องกันการสร้างปฏิทินซ้ำซ้อนในช่องเดิม
            if (el._flatpickr) return;

            const fp = flatpickr(el, {
                locale: "th",
                dateFormat: "j F Y",
                disableMobile: true, // [ปรับปรุง] แก้ไขเป็น Boolean
                
                // เมื่อปฏิทินโหลดเสร็จ
                onReady: function(selectedDates, dateStr, instance) {
                    // --- ส่วนที่ 1: สร้างปุ่ม "วันนี้" ไว้ด้านล่าง ---
                    const btn = document.createElement('div');
                    btn.className = 'flatpickr-today-btn';
                    btn.innerHTML = 'วันนี้';
                    btn.addEventListener('click', () => { 
                        instance.setDate(new Date(), true); 
                        instance.close(); 
                    });
                    instance.calendarContainer.appendChild(btn);

                    // --- ส่วนที่ 2: เวทมนตร์จัดการปี พ.ศ. ไม่ให้กระพริบ ---
                    if (instance.currentYearElement && !instance.currentYearElement.hasAttribute('data-patched')) {
                        instance.currentYearElement.setAttribute('data-patched', 'true');
                        
                        const originalSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                        const originalGet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').get;
                        
                        Object.defineProperty(instance.currentYearElement, 'value', {
                            set: function(val) {
                                let year = parseInt(val, 10);
                                // ดักไว้ว่าถ้าเป็นปี ค.ศ. (น้อยกว่า 2400) ให้บวก 543 เสมอ
                                if (!isNaN(year) && year < 2400) { 
                                    year += 543; 
                                }
                                originalSet.call(this, year);
                            },
                            get: function() { 
                                return originalGet.call(this); 
                            }
                        });
                        // สั่งให้ทำงานครั้งแรกเพื่อแสดงปี พ.ศ. ทันที
                        instance.currentYearElement.value = instance.currentYear;
                    }
                },
                
                // --- ส่วนที่ 3: ป้องกันปฏิทินคำนวณปีเพี้ยนเวลาเปลี่ยนปี ---
                onYearChange: function(selectedDates, dateStr, instance) {
                    if (instance.currentYear > 2400) { 
                        instance.changeYear(instance.currentYear - 543); 
                    }
                },
                
                // --- ส่วนที่ 4: แสดงข้อความในช่อง Input เป็น พ.ศ. ---
                formatDate: (date, format, locale) => {
                    const thaiYear = date.getFullYear() + 543;
                    return flatpickr.formatDate(date, format, locale).replace(date.getFullYear(), thaiYear);
                }
            });

            // จดจำปฏิทินตัวนี้ไว้ในระบบ (มีระบบสร้าง ID สำรองถ้าลืมใส่)
            let elId = el.id;
            if (!elId) {
                elId = 'dp_' + Math.random().toString(36).substr(2, 9);
                el.id = elId;
            }
            this.instances[elId] = fp;
        });
    },

    /**
     * 2. ฟังก์ชันดึงค่า ISO ไปบันทึกลง Google Sheets
     * วิธีใช้: let isoDate = ThaiDatePicker.getISODate('witnessDate');
     * ผลลัพธ์: "2026-08-04"
     */
    getISODate: function(elementId) {
        const fp = this.instances[elementId];
        if (!fp || fp.selectedDates.length === 0) return ""; 
        
        const date = fp.selectedDates[0];
        const year = date.getFullYear(); 
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`; 
    },

    /**
     * 3. ฟังก์ชันดึงค่า ISO จากฐานข้อมูลมาใส่ในโหมด "แก้ไข"
     * วิธีใช้: ThaiDatePicker.setISODate('witnessDate', '2026-08-04');
     */
    setISODate: function(elementId, isoDateStr) {
        const fp = this.instances[elementId];
        if (!fp || !isoDateStr) return;
        
        // [ปรับปรุง] เพิ่ม true เพื่อให้ Trigger Event อัปเดตหน้าตาปฏิทินทันที
        fp.setDate(isoDateStr, true); 
    },

    /**
     * 4. ฟังก์ชันล้างข้อมูลในช่องให้เป็นค่าว่าง (สำหรับโหมด "เพิ่มข้อมูลใหม่")
     * วิธีใช้: ThaiDatePicker.clear('witnessDate');
     */
    clear: function(elementId) {
        const fp = this.instances[elementId];
        if (fp) {
            fp.clear(); 
        }
    },

    /**
     * 5. [ปรับปรุง] ฟังก์ชันทำลายปฏิทิน คืนหน่วยความจำ (ใช้เมื่อลบช่อง Input ทิ้ง)
     * วิธีใช้: ThaiDatePicker.destroy('witnessDate');
     */
    destroy: function(elementId) {
        const fp = this.instances[elementId];
        if (fp) {
            fp.destroy();
            delete this.instances[elementId];
        }
    },

    /**
     * 6. [ปรับปรุง] ฟังก์ชันฝัง CSS อัตโนมัติ (Internal Method)
     * จะทำงานแค่ครั้งเดียว ป้องกันการสร้าง CSS ซ้ำซ้อน
     */
    _injectCSS: function() {
        if (document.getElementById('thai-datepicker-styles')) return; // ถ้ามีแล้วให้ข้ามไป
        
        const style = document.createElement('style');
        style.id = 'thai-datepicker-styles';
        // หมายเหตุ: มีการใส่ Fallback Color (#1e293b) ไว้เผื่อโปรเจกต์ใหม่ไม่มีตัวแปร --navy-main
        style.innerHTML = `
            /* ตกแต่งปฏิทิน Flatpickr */
            .flatpickr-calendar { border-radius: 16px !important; box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important; border: none !important; z-index: 99999 !important; }
            .flatpickr-day.selected { background: var(--navy-main, #1e293b) !important; border-color: var(--navy-main, #1e293b) !important; }
            .flatpickr-today-btn { text-align: center; padding: 12px; background: #f8fafc; cursor: pointer; font-family: 'Kanit', sans-serif; font-size: 0.95rem; color: var(--navy-main, #1e293b); border-top: 1px solid #e2e8f0; font-weight: 500; border-radius: 0 0 16px 16px; }
            .flatpickr-today-btn:hover { background: #f1f5f9; }

            /* สีวันเสาร์-อาทิตย์ในปฏิทิน */
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
