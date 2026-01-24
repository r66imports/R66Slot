# Customer Account System - Complete Guide

## 🎉 Customer Login & Accounts Now Live!

Your R66SLOT site now has a complete customer account system where customers can register, login, and manage their information.

---

## 📍 Access Points

### For Customers:
- **Login:** `/account/login` or click the Account icon (👤) in the header
- **Register:** `/account/register` or click "Create one" from login page
- **Dashboard:** `/account` (after login)

### In the Header:
- Desktop: Account icon (👤) in top-right
- Mobile: "Account" link in mobile menu

---

## ✨ Features

### 1. **Customer Registration**
- First name, last name
- Email address
- Password (min 8 characters)
- Terms & privacy policy acceptance

### 2. **Customer Login**
- Email & password authentication
- "Remember me" checkbox
- Secure JWT token-based sessions (7-day expiry)
- Automatic redirect if not logged in

### 3. **Account Dashboard** (`/account`)
- Welcome message with customer name
- Quick stats:
  - Total orders
  - Pending orders
  - Saved addresses
- Quick action buttons
- Recent orders preview
- Account information summary

### 4. **Order History** (`/account/orders`)
- View all past orders
- Order status tracking (pending, processing, shipped, delivered, cancelled)
- Order details:
  - Order number
  - Date
  - Item count
  - Total amount
- "Buy Again" for delivered orders
- View order details page

### 5. **Profile Settings** (`/account/profile`)
- Edit personal information:
  - First & last name
  - Email address
  - Phone number
- Change password:
  - Current password verification
  - New password (min 8 characters)
  - Confirmation
- Account actions:
  - View member since date
  - Delete account option

### 6. **Address Management** (`/account/addresses`)
- Add multiple shipping addresses
- Edit/delete addresses
- Set default address
- Full address fields:
  - Name
  - Address lines 1 & 2
  - City, State, ZIP
  - Country
  - Phone number

---

## 🔐 Security Features

### Authentication:
- **Passwords:** Hashed with bcrypt (10 rounds)
- **Sessions:** JWT tokens with 7-day expiry
- **Cookies:** HttpOnly, Secure (in production), SameSite
- **Token Secret:** Configurable via `JWT_SECRET` env variable

### Data Storage:
- Customer data: `data/customers.json`
- Orders: `data/orders.json`
- Addresses: `data/addresses.json`
- All files auto-created on first use

### API Protection:
- All account API routes require authentication
- Token verification on every request
- Password never returned in API responses

---

## 🗂️ File Structure

### Pages:
```
src/app/(account)/
├── layout.tsx              # Account layout with sidebar
├── account/
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── register/
│   │   └── page.tsx        # Registration page
│   ├── page.tsx            # Dashboard
│   ├── orders/
│   │   └── page.tsx        # Orders list
│   ├── profile/
│   │   └── page.tsx        # Profile settings
│   └── addresses/
│       └── page.tsx        # Address management
```

### API Routes:
```
src/app/api/
├── auth/
│   ├── login/route.ts      # POST - Customer login
│   ├── register/route.ts   # POST - Customer registration
│   ├── me/route.ts         # GET - Get current user
│   └── logout/route.ts     # POST - Logout
└── account/
    ├── stats/route.ts      # GET - Dashboard stats
    ├── orders/route.ts     # GET - List orders
    ├── profile/route.ts    # PUT - Update profile
    └── addresses/route.ts  # GET/POST - Address CRUD
```

### Data Files:
```
data/
├── customers.json          # Customer accounts
├── orders.json            # Customer orders
└── addresses.json         # Shipping addresses
```

---

## 🚀 How to Use

### Customer Registration Flow:
1. Customer clicks Account icon or goes to `/account/login`
2. Clicks "Create one" link
3. Fills registration form
4. On success, auto-logged in and redirected to dashboard

### Customer Login Flow:
1. Customer enters email & password
2. System validates credentials
3. JWT token created and set in cookie
4. Redirected to account dashboard

### Account Navigation:
- Sidebar with 4 sections:
  - Dashboard 🏠
  - Orders 📦
  - Addresses 📍
  - Profile 👤
- "Continue Shopping" link
- Logout button

---

## 📊 Customer Data Structure

### Customer Object:
```json
{
  "id": "cust_1234567890_abc123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "$2a$10$...", // bcrypt hash
  "phone": "+1234567890",
  "createdAt": "2026-01-23T...",
  "updatedAt": "2026-01-23T..."
}
```

### Address Object:
```json
{
  "id": "addr_1234567890_xyz789",
  "customerId": "cust_1234567890_abc123",
  "firstName": "John",
  "lastName": "Doe",
  "address1": "123 Main St",
  "address2": "Apt 4B",
  "city": "New York",
  "state": "NY",
  "zip": "10001",
  "country": "United States",
  "phone": "+1234567890",
  "isDefault": true,
  "createdAt": "2026-01-23T...",
  "updatedAt": "2026-01-23T..."
}
```

---

## 🎨 UI Design

### Colors:
- Primary Yellow: `#FFDD00`
- Black: `#000000`
- White: `#FFFFFF`
- Gray shades for text/borders

### Components Used:
- Card - For content containers
- Button - Primary & outline variants
- Input - Form fields with labels
- Layout - Responsive sidebar + main content

### Responsive:
- Mobile: Stacked layout, collapsible sidebar
- Tablet: Side-by-side with adjusted spacing
- Desktop: Full sidebar + wide content area

---

## 🔧 Configuration

### Environment Variables:
Add to `.env.local`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**IMPORTANT:** Change the JWT secret in production!

### Default Token Expiry:
- 7 days (604800 seconds)
- Configurable in auth routes

---

## 🧪 Testing

### Create Test Customer:
1. Go to `/account/register`
2. Fill form:
   - First Name: Test
   - Last Name: Customer
   - Email: test@example.com
   - Password: testpass123
3. Click "Create Account"
4. Should redirect to `/account` dashboard

### Test Login:
1. Logout if logged in
2. Go to `/account/login`
3. Enter:
   - Email: test@example.com
   - Password: testpass123
4. Click "Sign In"
5. Should redirect to dashboard

### Test Features:
- ✅ Add/edit/delete addresses
- ✅ Update profile information
- ✅ Change password
- ✅ View orders (will be empty initially)
- ✅ Logout

---

## 🔄 Integration with Shopify (Future)

The system is ready to integrate with Shopify orders:

1. When checkout completes, create order in `data/orders.json`
2. Include customer ID from logged-in customer
3. Orders will automatically appear in `/account/orders`

Sample order format:
```json
{
  "id": "order_123",
  "customerId": "cust_abc",
  "orderNumber": "R66-1001",
  "date": "2026-01-23T...",
  "status": "pending",
  "total": 149.99,
  "itemCount": 3,
  "items": [...],
  "shippingAddress": {...}
}
```

---

## ⚠️ Important Notes

### Security:
- **Never commit JWT_SECRET to git**
- Use strong secrets in production
- Enable HTTPS in production (cookies set to secure)
- Regularly update dependencies

### Data Backup:
- JSON files in `data/` directory
- Backup regularly
- Consider database migration for production

### Password Requirements:
- Minimum 8 characters
- Stored as bcrypt hash
- Never logged or displayed

### Session Management:
- 7-day cookie expiry
- HttpOnly (not accessible via JavaScript)
- Auto-logout after 7 days
- Manual logout available

---

## 📈 Future Enhancements

Potential additions:
- [ ] Email verification
- [ ] Password reset via email
- [ ] OAuth login (Google, Facebook)
- [ ] Two-factor authentication
- [ ] Order tracking with carrier integration
- [ ] Wishlist functionality
- [ ] Saved payment methods
- [ ] Subscription management
- [ ] Loyalty points/rewards
- [ ] Email notifications
- [ ] Customer support tickets

---

## 🐛 Troubleshooting

### "Not authenticated" error:
- Check if cookie is being set
- Verify JWT_SECRET matches
- Clear cookies and login again

### Can't access account pages:
- Ensure you're logged in
- Check for JavaScript errors in console
- Verify API routes are working

### Password won't change:
- Verify current password is correct
- Ensure new password meets requirements
- Check bcrypt is properly installed

---

## 💡 Pro Tips

1. **Test with Multiple Accounts** - Create several test accounts to test the system
2. **Use Browser DevTools** - Check Network tab for API calls
3. **Check JSON Files** - View `data/customers.json` to see stored data
4. **Clear Cookies** - If having issues, clear cookies and re-login
5. **Responsive Testing** - Test on mobile, tablet, and desktop

---

*Generated: January 2026*
*System Version: 1.0*
