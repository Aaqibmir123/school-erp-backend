/** Simple notification after school approval (no password link). */
export const approvalNoticeTemplate = (loginUrl: string) => {
  const safeUrl = loginUrl.replace(/\/$/, "");
  return `
    <h2>Your school has been approved</h2>
    <p>You can log in to the School ERP admin with the email and password you chose during registration.</p>
    <p><a href="${safeUrl}" style="padding:10px 20px;background:#1677ff;color:white;text-decoration:none;">Open login</a></p>
  `;
};
