import * as XLSX from "xlsx";

export function parseDTRExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        const getCell = (sheet, addr) => sheet[addr]?.v ?? "";

        const results = [];

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];

          const dtr = {
            sheetName,
            employee: {
              name: getCell(sheet, "C9"),
              project: getCell(sheet, "I9"),
              employeeNo: getCell(sheet, "I10"),
              department: getCell(sheet, "I12"),
              timeShift: getCell(sheet, "I13"),
              periodFrom: getCell(sheet, "D10"),
              periodTo: getCell(sheet, "D11"),
              timeFrom: getCell(sheet, "D12"),
              timeTo: getCell(sheet, "D13"),
              restDay: getCell(sheet, "D14"),
            },
            days: [],
            totals: {
              totalOT: getCell(sheet, "H33"),
              totalHoliday: getCell(sheet, "I33"),
              regularDays: getCell(sheet, "D35"),
              regularOT: getCell(sheet, "D36"),
              legalHoliday: getCell(sheet, "D38"),
              unworkLegalHoliday: getCell(sheet, "D39"),
              specialHoliday: getCell(sheet, "D40"),
              absent: getCell(sheet, "D44"),
              late: getCell(sheet, "D45"),
            },
          };

          for (let row = 17; row <= 32; row++) {
            dtr.days.push({
              day: getCell(sheet, `B${row}`),
              timeIn: getCell(sheet, `C${row}`),
              timeOut: getCell(sheet, `D${row}`),
              otIn: getCell(sheet, `E${row}`),
              otOut: getCell(sheet, `F${row}`),
              otHours: getCell(sheet, `G${row}`),
              holidayHours: getCell(sheet, `H${row}`),
              remarks: getCell(sheet, `I${row}`),
            });
          }

          results.push(dtr);
        });

        resolve(results);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
