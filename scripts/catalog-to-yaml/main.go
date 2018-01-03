package main

import (
	"bytes"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"regexp"
	"strings"

	"github.com/andybalholm/cascadia"
	"github.com/kennygrant/sanitize"
	"github.com/satori/go.uuid"
	"golang.org/x/net/html"
	"golang.org/x/text/encoding/charmap"
	yaml "gopkg.in/yaml.v2"
)

// Config is the type representation of the yaml config file.
type Config struct {
	Src string
	Dst string
}

// CatalogID is an object containeing a numerical ID, a Name based on
// the catalog item's title and a GUID that merges Name and ID.
type CatalogID struct {
	ID   int
	Name string
	UUID uuid.UUID
}

// Category represents a category a work belongs to.
type Category struct {
	CatalogID CatalogID
	Title     string
}

// Work represents a work in the catalog.
type Work struct {
	Category  Category
	CatalogID CatalogID
	Title     string
	Meta      map[string]string
}

// NewCatalogID generates a new CatalogID object.
func NewCatalogID(title string, version string) CatalogID {
	name := strings.ToLower(sanitize.Name(title))
	guid := uuid.NewV4()
	id := 0

	for i, c := range name {
		id += i * int(c)
	}

	for i, c := range strings.ToLower(sanitize.Name(version)) {
		id += i * int(c)
	}

	return CatalogID{
		ID:   id,
		Name: name,
		UUID: guid,
	}
}

func main() {
	config := getConfig()
	doc := getHTMLDoc(config.Src)

	titles := cascadia.MustCompile("h1").MatchAll(doc)

	for _, titleNode := range titles {
		title := strings.ToLower(getTagText(titleNode))
		id := NewCatalogID(title, "")

		category := Category{
			CatalogID: id,
			Title:     title,
		}

		cm, err := yaml.Marshal(category)
		if err != nil {
			panic(err)
		}

		err = ioutil.WriteFile(category.CatalogID.Name+".yaml", cm, 0644)
		if err != nil {
			panic(err)
		}

		os.Mkdir(category.CatalogID.Name, 0644)

		table := getSibling(titleNode, "table", "h1")
		rows := cascadia.MustCompile("tr").MatchAll(table)

		for _, row := range rows {
			cols := cascadia.MustCompile("td").MatchAll(row)

			title := getTagText(cols[0])

			if len(title) == 0 {
				continue
			}

			switch len(cols) {
			case 1:
				fmt.Println(category.CatalogID.ID, category.Title)
				// case 2:
				// 	key := getTagText(cols[0])
				// 	value := getTagText(cols[1])
				// 	fmt.Println("key      =>", key)
				// 	fmt.Println("value    =>", value)
				// default:
				// 	fmt.Println("row has 3 columns")

			}
			break
		}
	}
}

func getConfig() Config {
	var config Config
	filename := os.Args[1]
	source, err := ioutil.ReadFile(filename)
	if err != nil {
		panic(err)
	}

	err = yaml.Unmarshal(source, &config)
	if err != nil {
		panic(err)
	}

	return config
}

func getHTMLDoc(srcPath string) *html.Node {
	b, err := ioutil.ReadFile(srcPath)
	if err != nil {
		panic(err)
	}

	reader := charmap.Windows1252.NewDecoder().Reader(bytes.NewReader(b))

	doc, err := html.Parse(reader)
	if err != nil {
		log.Fatal(err)
	}

	return doc
}

func cleanString(str string) string {
	cleanedStr := make([]rune, 1)
	skip := [...]rune{0, 160}

	for _, c := range str {
		skipped := false

		for _, s := range skip {
			if c == s {
				skipped = true
			}
		}

		if skipped {
			continue
		}

		cleanedStr = append(cleanedStr, c)
	}

	return string(cleanedStr)
}

func getTagText(tag *html.Node) string {
	reStripTabsAndCR := regexp.MustCompile("(?i)[\t\r\n]")
	reStripSpaces := regexp.MustCompile("(?i)\\s+")

	buf := bytes.NewBufferString("")
	html.Render(buf, tag)

	str := buf.String()
	str = sanitize.HTML(str)
	str = sanitize.Accents(str)
	str = reStripTabsAndCR.ReplaceAllString(str, " ")
	str = cleanString(str)
	str = reStripSpaces.ReplaceAllString(str, " ")

	if str[0] == 0 {
		str = str[1:]
	}

	str = strings.Trim(str, " ")

	return str
}

func getSibling(node *html.Node, siblingName string, stopAtSibling string) *html.Node {
	nextSibling := node

	for {
		nextSibling = nextSibling.NextSibling
		if strings.ToLower(nextSibling.Data) == strings.ToLower(siblingName) ||
			strings.ToLower(nextSibling.Data) == strings.ToLower(stopAtSibling) {
			break
		}
	}
	return nextSibling
}
