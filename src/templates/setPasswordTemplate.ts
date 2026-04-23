export const setPasswordTemplate = (link: string) => {
  return `
    <h2>Welcome to School ERP</h2>
    <p>Your school has been approved.</p>

    <p>Click below to set your password:</p>

    <a href="${link}" 
       style="padding:10px 20px;background:#1677ff;color:white;text-decoration:none;">
       Set Password
    </a>

    <p>This link expires in 24 hours.</p>
  `;
};
