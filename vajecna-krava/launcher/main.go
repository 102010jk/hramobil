// Spouštěč Vaječné krávy pro Windows: hru (jeden HTML soubor) má zabalenou uvnitř,
// pustí ji na místním serveru a otevře v okně Edge/Chrome (nebo ve výchozím prohlížeči).
// Po zavření okna se sám ukončí.
package main

import (
	_ "embed"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"time"
)

//go:embed game.html
var page []byte

var lastPing atomic.Int64

const heartbeat = `<script>setInterval(function(){fetch('/ping').catch(function(){})},5000);fetch('/ping').catch(function(){});</script></body>`

func main() {
	// pevný port, aby se uložený postup (localStorage) neztrácel
	ln, err := net.Listen("tcp", "127.0.0.1:47123")
	if err != nil {
		ln, err = net.Listen("tcp", "127.0.0.1:0")
		if err != nil {
			os.Exit(1)
		}
	}
	html := []byte(strings.Replace(string(page), "</body>", heartbeat, 1))
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		lastPing.Store(time.Now().Unix())
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Write(html)
	})
	go http.Serve(ln, mux)

	url := fmt.Sprintf("http://%s/", ln.Addr().String())
	open(url)

	// konec, když hra 90 s nedala vědět, že běží (okno zavřené)
	lastPing.Store(time.Now().Unix() + 60)
	for {
		time.Sleep(5 * time.Second)
		if time.Now().Unix()-lastPing.Load() > 90 {
			os.Exit(0)
		}
	}
}

func open(url string) {
	var candidates []string
	for _, env := range []string{"ProgramFiles(x86)", "ProgramFiles", "LocalAppData"} {
		base := os.Getenv(env)
		if base == "" {
			continue
		}
		candidates = append(candidates,
			filepath.Join(base, "Microsoft", "Edge", "Application", "msedge.exe"),
			filepath.Join(base, "Google", "Chrome", "Application", "chrome.exe"),
		)
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			if exec.Command(p, "--app="+url, "--window-size=1280,800").Start() == nil {
				return
			}
		}
	}
	exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
}
