package main

import (
	"bytes"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
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
	Dst struct {
		WorksRoot  string `yaml:"works_root"`
		Categories string
		Relations  string
		Publishers string
	}
	IsFrontMatter bool `yaml:"is-front-matter"`
}

// CatalogID is an object containeing a numerical ID, a Name based on
// the catalog item's title and a GUID that merges Name and ID.
type CatalogID struct {
	ID    string
	NumID int `yaml:"num_id"`
	Name  string
	UUID  uuid.UUID
}

// Category represents a category a work belongs to.
type Category struct {
	CatalogID CatalogID `yaml:"ff_catalog_id"`
	Title     string    `yaml:"ff_title"`
}

// Work represents a work in the catalog.
type Work struct {
	CategoryID string    `yaml:"ff_category_id"`
	CatalogID  CatalogID `yaml:"ff_catalog_id"`
	Title      string    `yaml:"ff_title"`
	Meta       map[string]string
}

// NewCatalogID generates a new CatalogID object.
func NewCatalogID(title string, count int) CatalogID {
	name := strings.ToLower(sanitize.Name(title))
	guid := uuid.NewV4()
	numid := count + 1
	id := fmt.Sprintf("%04d", numid) + "-" + name

	return CatalogID{
		ID:    id,
		NumID: numid,
		Name:  name,
		UUID:  guid,
	}
}

func main() {
	config := getConfig()
	doc := getHTMLDoc(config.Src)
	titles := cascadia.MustCompile("h1").MatchAll(doc)
	categories := make([]Category, 0)
	metas := make([]string, 1)
	works := make(map[string]Work)

	for _, titleNode := range titles {
		title := strings.Title(strings.ToLower(getTagText(titleNode)))
		categoryID := NewCatalogID(title, len(categories))
		category := Category{
			CatalogID: categoryID,
			Title:     title,
		}

		if category.CatalogID.Name == "abbreviations" ||
			category.CatalogID.Name == "hungarian-pronunciation" {
			continue
		}

		categories = append(categories, category)
		table := getSibling(titleNode, "table", "h1")
		rows := cascadia.MustCompile("tr").MatchAll(table)

		var work Work

		for _, row := range rows {
			cols := cascadia.MustCompile("td").MatchAll(row)
			title := getTagText(cols[0])

			if len(cols) == 0 && len(title) == 0 {
				continue
			}

			switch len(cols) {
			case 1:
				if work.Title != "" {
					works[work.CatalogID.ID] = work
				}

				workID := NewCatalogID(title, len(works))
				meta := make(map[string]string)

				work = Work{
					CatalogID:  workID,
					CategoryID: category.CatalogID.Name,
					Title:      title,
					Meta:       meta,
				}
			case 2:
				key := sanitize.Name(strings.ToLower(getTagText(cols[0])))
				value := getTagText(cols[1])

				if len(key) < 2 {
					key = "description"
				}

				if !listContainsString(metas, key) {
					metas = append(metas, key)
				}

				work.Meta[key] = value
				writeWork(work, config.Dst.WorksRoot, config.IsFrontMatter)
			default:
				fmt.Println("row has 3 columns")
			}
		}
	}

	for _, meta := range metas {
		fmt.Println(meta)
	}

	writeYamlFile(categories, config.Dst.Categories)
}

func listContainsString(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
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
	str = reStripTabsAndCR.ReplaceAllString(str, " ")
	str = sanitize.HTML(str)
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

func writeWork(work Work, rootPath string, isFrontMatter bool) error {
	workMap := yaml.MapSlice{
		{Key: "outputs", Value: []string{"html", "json"}},
		{Key: "ff_catalog_id", Value: work.CatalogID},
		{Key: "ff_title", Value: work.Title},
		{Key: "ff_category_id", Value: work.CategoryID},
	}

	for k, v := range work.Meta {
		key := "ff_" + k
		key = strings.Replace(key, "-", "_", -1)
		key = strings.Replace(key, ".", "", -1)

		workMap = append(workMap, yaml.MapItem{Key: key, Value: v})
	}

	marshal, err := yaml.Marshal(workMap)
	if err != nil {
		return errors.New("Could not marshal work '" + work.Title + "' to yaml format.")
	}

	file := filepath.FromSlash(rootPath + "/" + work.CatalogID.ID + ".yaml")
	fmt.Println("Writing file " + file + "...")

	if isFrontMatter {
		dash := "-"[0]
		dashes := []byte{dash, dash, dash}
		marshal = append(append(dashes, "\n"[0]), marshal...)
		marshal = append(marshal, dashes...)
		file = strings.Replace(file, ".yaml", ".md", 1)
	}

	err = ioutil.WriteFile(file, marshal, 0644)
	if err != nil {
		return err
	}

	return nil
}

func writeYamlFile(content interface{}, file string) {
	marshal, err := yaml.Marshal(content)
	if err != nil {
		panic(err)
	}

	err = ioutil.WriteFile(file, marshal, 0644)
	if err != nil {
		panic(err)
	}
}
