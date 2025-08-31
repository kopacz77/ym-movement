# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]: Welcome to YM Movement
      - generic [ref=e6]: Login to your account
    - generic [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]: Email
        - textbox "Email" [ref=e11]: admin@ym-movement.com
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]: admin123
        - link "Forgot password?" [ref=e16] [cursor=pointer]:
          - /url: /auth/forgot-password
      - button "Login" [ref=e17] [cursor=pointer]
    - paragraph [ref=e19]:
      - text: Don't have an account?
      - link "Sign up" [ref=e20] [cursor=pointer]:
        - /url: /auth/signup
  - region "Notifications alt+T":
    - list:
      - listitem [ref=e21]:
        - img [ref=e23]
        - generic [ref=e25]:
          - generic [ref=e26]: Login Failed
          - generic [ref=e27]: CredentialsSignin
  - alert [ref=e28]
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - img [ref=e35] [cursor=pointer]
```