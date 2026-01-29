const nodemailer = require("nodemailer");

// Create transporter based on environment
const createTransporter = () => {
    // For production, use real SMTP credentials
    if (process.env.NODE_ENV === "production") {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === "true",
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    
    // For development, use Ethereal (fake SMTP for testing)
    // Or use Gmail with App Password
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken, userName) => {
    const transporter = createTransporter();
    
    // The reset URL - adjust based on your frontend URL
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password/${resetToken}`;
    
    const mailOptions = {
        from: `"Neo-CNS Support" <${process.env.SMTP_USER || "noreply@neo-cns.com"}>`,
        to: email,
        subject: "Password Reset Request - Neo-CNS",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Neo-CNS</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Courier Network System</p>
                </div>
                
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                    
                    <p style="color: #555; line-height: 1.6;">
                        Hi ${userName || "User"},
                    </p>
                    
                    <p style="color: #555; line-height: 1.6;">
                        We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                  color: white; 
                                  padding: 14px 30px; 
                                  text-decoration: none; 
                                  border-radius: 8px; 
                                  font-weight: bold;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    
                    <p style="color: #888; font-size: 14px; line-height: 1.6;">
                        This link will expire in <strong>1 hour</strong>.
                    </p>
                    
                    <p style="color: #888; font-size: 14px; line-height: 1.6;">
                        If you didn't request a password reset, you can safely ignore this email. 
                        Your password will remain unchanged.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    
                    <p style="color: #888; font-size: 12px; line-height: 1.6;">
                        If the button doesn't work, copy and paste this link into your browser:
                        <br>
                        <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
                    </p>
                </div>
                
                <div style="background: #333; padding: 20px; text-align: center;">
                    <p style="color: #888; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Neo-CNS. All rights reserved.
                    </p>
                </div>
            </div>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("✉️ Password reset email sent:", info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error("❌ Error sending email:", error);
        throw new Error("Failed to send password reset email");
    }
};

module.exports = {
    sendPasswordResetEmail
};
