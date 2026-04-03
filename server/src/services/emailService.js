import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure .env is loaded even if this module initializes before the main app
// Load .env - for Vercel, we recommend using Environment Variables in the dashboard
dotenv.config(); 
// If local dev needs it from ../../.env, it's safer to just let the main app handle it.

// Configure your email service here
// Using Gmail example - replace with your email service
const emailUser = process.env.EMAIL_USER?.trim();
const emailPass = process.env.EMAIL_PASSWORD?.trim();

console.log('[Email Config]', {
  hasUser: !!emailUser,
  hasPass: !!emailPass,
  user: emailUser ? emailUser.substring(0, 5) + '***' : 'NOT SET'
});

// Configure transporter only if credentials exist
let transporter;
if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
}

// Test connection
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.warn('⚠️ Email service not configured:', error.message);
      console.warn('   You can still use the app - emails will be skipped');
    } else {
      console.log('✅ Email service ready');
    }
  });
} else {
  console.warn('⚠️ Email transporter not initialized (missing EMAIL_USER/EMAIL_PASSWORD). Emails will be skipped.');
}

export const sendRegistrationEmail = async (email, name, role) => {
  try {
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">🌾 Welcome to AgriMart!</h1>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            Thank you for registering with <strong>AgriMart</strong>!
          </p>
          
          <div style="background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>Registration Confirmed</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              Your account has been successfully created as a <strong style="color: #667eea;">${roleDisplay}</strong>
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            You can now log in to your account using your registered email and password.
          </p>
          
          <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
        
        <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #999;">
          <p style="margin: 0;">AgriMart © 2026. All rights reserved.</p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Welcome to AgriMart - Registration Confirmed as ${roleDisplay}`,
      html: htmlContent,
    };
    
    if (!transporter) {
      console.warn('Skipping registration email: transporter not configured');
      return false;
    }
    await transporter.sendMail(mailOptions);
    console.log(`Registration email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending registration email:', error.message);
    return false;
  }
};

export const sendLoginEmail = async (email, name, role) => {
  try {
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
    const timestamp = new Date().toLocaleString();
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">✅ Login Successful</h1>
        </div>
        
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${name}</strong>,</p>
          
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            You have successfully logged into your AgriMart account.
          </p>
          
          <div style="background: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333;"><strong>Login Details</strong></p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
              <strong>Role:</strong> ${roleDisplay}
            </p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666;">
              <strong>Time:</strong> ${timestamp}
            </p>
          </div>
          
          <p style="font-size: 14px; color: #666; margin: 20px 0;">
            If this wasn't you, please change your password immediately.
          </p>
          
          <div style="background: #fff3cd; padding: 12px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #856404;">
              🔒 <strong>Security Tip:</strong> Never share your login credentials with anyone.
            </p>
          </div>
          
          <p style="font-size: 14px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            This email was sent because there was a login to your account. If you didn't log in, please contact support immediately.
          </p>
        </div>
        
        <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #999;">
          <p style="margin: 0;">AgriMart © 2026. All rights reserved.</p>
        </div>
      </div>
    `;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `AgriMart - Login Successful as ${roleDisplay}`,
      html: htmlContent,
    };
    
    if (!transporter) {
      console.warn('Skipping login email: transporter not configured');
      return false;
    }
    await transporter.sendMail(mailOptions);
    console.log(`Login email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending login email:', error.message);
    return false;
  }
};

export const sendPasswordResetEmail = async (email, name, resetLink) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="background: linear-gradient(135deg, #1e8e3e 0%, #43a047 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0;">🔐 Password Reset</h1>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 16px; color: #333;">Hello <strong>${name}</strong>,</p>
          <p style="font-size: 15px; color: #555; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new password.
          </p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background: #1e8e3e; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 13px; color: #777;">
            This link will expire in 30 minutes. If you didn’t request this, you can safely ignore this email.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
            If the button doesn’t work, copy and paste this link into your browser:<br />
            <span style="color: #1e8e3e;">${resetLink}</span>
          </p>
        </div>
        <div style="background: #f9f9f9; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #999;">
          <p style="margin: 0;">AgriMart © 2026. All rights reserved.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'AgriMart - Password Reset Request',
      html: htmlContent,
    };

    if (!transporter) {
      console.warn('Skipping password reset email: transporter not configured');
      return false;
    }
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    return false;
  }
};

const toRupees = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
};

const toSafeString = (value) => {
  if (value === null || value === undefined) return 'N/A';
  const text = String(value).trim();
  return text || 'N/A';
};

const buildOrderSummaryTable = ({ itemsTotal, transportFee, platformFee, total }) => `
  <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">Product Price</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rs. ${toRupees(itemsTotal)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">Dealer Charges</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rs. ${toRupees(transportFee)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">Admin Platform Fee</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rs. ${toRupees(platformFee)}</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd; font-weight: 700;">Total</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: 700;">Rs. ${toRupees(total)}</td>
    </tr>
  </table>
`;

const buildIdBlock = ({ orderId, customerId, farmerId, dealerId }) => `
  <div style="background: #f7f7f7; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; color: #333;">
    <div><strong>Order ID:</strong> ${toSafeString(orderId)}</div>
    <div><strong>Customer ID:</strong> ${toSafeString(customerId)}</div>
    <div><strong>Farmer ID:</strong> ${toSafeString(farmerId)}</div>
    <div><strong>Dealer ID:</strong> ${toSafeString(dealerId)}</div>
  </div>
`;

const sendRoleOrderEmail = async ({ to, subject, heading, intro, earningLabel, earningValue, orderData }) => {
  if (!to) return false;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #1e8e3e; color: #fff; padding: 18px 20px;">
        <h2 style="margin: 0; font-size: 20px;">${heading}</h2>
      </div>
      <div style="padding: 20px; color: #333;">
        <p style="margin-top: 0;">${intro}</p>
        ${buildIdBlock(orderData)}
        ${buildOrderSummaryTable(orderData)}
        <div style="margin-top: 16px; padding: 12px; background: #eef7ee; border-left: 4px solid #1e8e3e;">
          <strong>${earningLabel}:</strong> Rs. ${toRupees(earningValue)}
        </div>
      </div>
    </div>
  `;

  if (!transporter) {
    console.warn('Skipping order confirmation email: transporter not configured');
    return false;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });

  return true;
};

export const sendOrderConfirmationEmails = async ({
  orderId,
  customer,
  farmer,
  dealer,
  pricing,
}) => {
  try {
    const orderData = {
      orderId,
      customerId: customer?.id,
      farmerId: farmer?.id,
      dealerId: dealer?.id,
      itemsTotal: pricing?.itemsTotal,
      transportFee: pricing?.transportFee,
      platformFee: pricing?.platformFee,
      total: pricing?.total,
    };

    const dealerEarning = Number(pricing?.transportFee || 0);
    const farmerEarning = Number(pricing?.itemsTotal || 0);

    const results = {
      customer: await sendRoleOrderEmail({
        to: customer?.email,
        subject: `AgriMart Order Confirmed - ${toSafeString(orderId)}`,
        heading: 'Order Confirmed',
        intro: `Hi ${toSafeString(customer?.name)}, your order has been confirmed successfully.`,
        earningLabel: 'Your Total Payable Amount',
        earningValue: pricing?.total,
        orderData,
      }),
      farmer: await sendRoleOrderEmail({
        to: farmer?.email,
        subject: `AgriMart New Order Received - ${toSafeString(orderId)}`,
        heading: 'New Order Placed by Customer',
        intro: `Hi ${toSafeString(farmer?.name)}, a customer has placed a new order for your crops.`,
        earningLabel: 'Your Expected Earning',
        earningValue: farmerEarning,
        orderData,
      }),
      dealer: await sendRoleOrderEmail({
        to: dealer?.email,
        subject: `AgriMart Delivery Order Assigned - ${toSafeString(orderId)}`,
        heading: 'Order Assigned for Delivery',
        intro: `Hi ${toSafeString(dealer?.name)}, a customer order has been assigned to you for transport.`,
        earningLabel: 'Your Expected Earning',
        earningValue: dealerEarning,
        orderData,
      }),
    };

    console.log('Order email results:', results);
    return results;
  } catch (error) {
    console.error('Error sending order confirmation emails:', error.message);
    return {
      customer: false,
      farmer: false,
      dealer: false,
    };
  }
};

const sendSimpleEmail = async ({ to, subject, html }) => {
  if (!to) return false;
  if (!transporter) {
    console.warn('Skipping email: transporter not configured');
    return false;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error.message);
    return false;
  }
};

export const sendDealerRequestEmail = async ({
  dealerEmail,
  dealerName,
  customerName,
  pickupLocation,
  dropLocation,
  quantity,
  quotedPrice,
  vehicleType,
  requestId,
  appBaseUrl,
}) => {
  const dealerRequestsLink = `${appBaseUrl}/transport-dealer/requests`;
  const quickAcceptLink = `${appBaseUrl}/transport-dealer/requests?requestId=${encodeURIComponent(requestId)}&action=accept`;
  const quickRejectLink = `${appBaseUrl}/transport-dealer/requests?requestId=${encodeURIComponent(requestId)}&action=reject`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #1e8e3e; color: #fff; padding: 18px 20px;">
        <h2 style="margin: 0; font-size: 20px;">New Customer Transport Request</h2>
      </div>
      <div style="padding: 20px; color: #333;">
        <p>Hi ${toSafeString(dealerName)},</p>
        <p>${toSafeString(customerName)} sent you a new transport request.</p>
        <div style="background: #f7f7f7; border-radius: 8px; padding: 12px; margin: 14px 0;">
          <div><strong>Request ID:</strong> ${toSafeString(requestId)}</div>
          <div><strong>Pickup:</strong> ${toSafeString(pickupLocation)}</div>
          <div><strong>Drop:</strong> ${toSafeString(dropLocation)}</div>
          <div><strong>Quantity:</strong> ${toSafeString(quantity)} kg</div>
          <div><strong>Vehicle:</strong> ${toSafeString(vehicleType)}</div>
          <div><strong>Quoted Price:</strong> Rs. ${toRupees(quotedPrice)}</div>
        </div>
        <p>Actions:</p>
        <div style="margin: 14px 0;">
          <a href="${dealerRequestsLink}" style="display: inline-block; margin-right: 10px; margin-bottom: 8px; background: #1e40af; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Open Dealer Requests</a>
          <a href="${quickAcceptLink}" style="display: inline-block; margin-right: 10px; margin-bottom: 8px; background: #059669; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Quick Accept</a>
          <a href="${quickRejectLink}" style="display: inline-block; margin-bottom: 8px; background: #dc2626; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Quick Reject</a>
        </div>
        <p style="font-size: 12px; color: #6b7280;">Login is required before action. Existing request page behavior is unchanged.</p>
      </div>
    </div>
  `;

  return sendSimpleEmail({
    to: dealerEmail,
    subject: `AgriMart - New Request from ${toSafeString(customerName)}`,
    html,
  });
};

export const sendRequestStatusEmail = async ({
  customerEmail,
  customerName,
  dealerName,
  status,
  reason,
  appBaseUrl,
}) => {
  const isAccepted = status === 'ACCEPTED';
  const chatLink = `${appBaseUrl}/chat`;
  const heading = isAccepted ? 'Dealer Accepted Your Request' : 'Dealer Rejected Your Request';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: ${isAccepted ? '#1e8e3e' : '#dc2626'}; color: #fff; padding: 18px 20px;">
        <h2 style="margin: 0; font-size: 20px;">${heading}</h2>
      </div>
      <div style="padding: 20px; color: #333;">
        <p>Hi ${toSafeString(customerName)},</p>
        <p>${toSafeString(dealerName)} has ${isAccepted ? 'accepted' : 'rejected'} your transport request.</p>
        ${!isAccepted && reason ? `<p><strong>Reason:</strong> ${toSafeString(reason)}</p>` : ''}
        ${isAccepted ? `<p><a href="${chatLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Open Chat</a></p>` : ''}
      </div>
    </div>
  `;

  return sendSimpleEmail({
    to: customerEmail,
    subject: `AgriMart - Dealer ${isAccepted ? 'Accepted' : 'Rejected'} Your Request`,
    html,
  });
};

export const sendChatDecisionEmail = async ({
  toEmail,
  receiverName,
  actorName,
  actorRole,
  decision,
  finalPrice,
  appBaseUrl,
}) => {
  const normalizedDecision = String(decision || '').toLowerCase();
  const decisionText = normalizedDecision === 'confirmed' ? 'confirmed' : 'rejected';
  const chatLink = `${appBaseUrl}/chat`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #0f766e; color: #fff; padding: 18px 20px;">
        <h2 style="margin: 0; font-size: 20px;">Chat Price Update</h2>
      </div>
      <div style="padding: 20px; color: #333;">
        <p>Hi ${toSafeString(receiverName)},</p>
        <p>${toSafeString(actorName)} (${toSafeString(actorRole)}) has ${decisionText} the negotiated price.</p>
        <p><strong>Final Price:</strong> Rs. ${toRupees(finalPrice)}</p>
        <p><a href="${chatLink}" style="display: inline-block; background: #2563eb; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">Open Chat</a></p>
      </div>
    </div>
  `;

  return sendSimpleEmail({
    to: toEmail,
    subject: `AgriMart - ${toSafeString(actorName)} ${decisionText} the negotiated price`,
    html,
  });
};
