/**
 * ========================================================
 * THAI DATEPICKER CORE (Flatpickr)
 * รองรับภาษาไทย, ปี พ.ศ. แท้ (ไม่กระพริบ), ดึงค่าเป็น ISO ได้
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
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(el => {
            const fp = flatpickr(el, {
                locale: "th",
                dateFormat: "j F Y",
                disableMobile: "true",
                
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
     * 3. ฟังก์ชันดึงค่า ISO จาก SessionStorage มาใส่ในโหมด "แก้ไข"
     * วิธีใช้: ThaiDatePicker.setISODate('witnessDate', '2026-08-02');
     */
    setISODate: function(elementId, isoDateStr) {
        const fp = this.instances[elementId];
        if (!fp || !isoDateStr) return;
        
        fp.setDate(isoDateStr); 
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
    }
};
