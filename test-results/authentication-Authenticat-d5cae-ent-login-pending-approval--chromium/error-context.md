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
        - textbox "Email" [ref=e11]: student@example.com
      - generic [ref=e12]:
        - generic [ref=e13]: Password
        - textbox "Password" [ref=e14]: StudentPassword123!
        - link "Forgot password?" [ref=e16] [cursor=pointer]:
          - /url: /auth/forgot-password
      - button "Loading..." [disabled]
    - paragraph [ref=e18]:
      - text: Don't have an account?
      - link "Sign up" [ref=e19] [cursor=pointer]:
        - /url: /auth/signup
  - region "Notifications alt+T"
  - alert [ref=e20]
  - button "Open Next.js Dev Tools" [ref=e26] [cursor=pointer]:
    - img [ref=e27] [cursor=pointer]
```