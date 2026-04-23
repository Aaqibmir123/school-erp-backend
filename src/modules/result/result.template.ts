export const generateMarksheetHTML = (data: any) => {
  return `
  <html>
    <body style="font-family: Arial; padding:20px">

      <!-- HEADER -->
      <div style="text-align:center;">
        <h2>${data.school.name}</h2>
        <p>${data.school.address}</p>
        <h3>${data.exam.name} Marksheet</h3>
      </div>

      <!-- STUDENT INFO -->
      <div style="margin-top:20px;">
        <p><b>Name:</b> ${data.student.name}</p>
        <p><b>Roll:</b> ${data.student.rollNumber}</p>
      </div>

      <!-- TABLE -->
      <table border="1" width="100%" style="border-collapse: collapse; margin-top:20px;">
        <tr>
          <th>Subject</th>
          <th>Marks</th>
          <th>Total</th>
        </tr>

        ${data.subjects
          .map(
            (s: any) => `
          <tr>
            <td>${s.name}</td>
            <td>${s.marks}</td>
            <td>${s.total}</td>
          </tr>`,
          )
          .join("")}
      </table>

      <!-- TOTAL -->
      <div style="margin-top:20px;">
        <h3>Total: ${data.total} / ${data.totalMarks}</h3>
        <h3>Percentage: ${data.percentage}%</h3>
      </div>

      <!-- SIGNATURE + SEAL -->
      <div style="display:flex; justify-content:space-between; margin-top:50px;">
        
        <div style="text-align:center;">
          ${
            data.school.signature
              ? `<img src="${data.school.signature}" style="height:60px; mix-blend-mode:multiply;" />`
              : ""
          }
          <p>Signature</p>
        </div>

        <div style="text-align:center;">
          ${
            data.school.seal
              ? `<img src="${data.school.seal}" style="height:60px; mix-blend-mode:multiply;" />`
              : ""
          }
          <p>Seal</p>
        </div>

      </div>

    </body>
  </html>
  `;
};
