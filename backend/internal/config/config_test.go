package config

import "testing"

func TestHostedDemoRequiresCredentials(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgresql://localhost/demo")
	t.Setenv("STATIC_DIR", "public")
	t.Setenv("DEMO_USERNAME", "demo")
	t.Setenv("DEMO_PASSWORD", "short")
	if _, err := Load(); err == nil {
		t.Fatal("hosted demo accepted a short password")
	}
	t.Setenv("DEMO_PASSWORD", "a-long-test-password")
	if _, err := Load(); err != nil {
		t.Fatal(err)
	}
}
