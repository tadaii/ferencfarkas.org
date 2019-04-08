package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"reflect"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/andybalholm/cascadia"
	"github.com/ifdesign/sanitize"
	"github.com/joho/godotenv"
	uuid "github.com/satori/go.uuid"
	"golang.org/x/net/html"
	"golang.org/x/text/encoding/charmap"
	yaml "gopkg.in/yaml.v2"
)

var translationsFile = ".translations.yaml"
var env = loadEnv()
var config = loadConfig()
var translations = loadTranslations()

// Env contains environment specific variables
type Env struct {
	LanguageAPIKey string
}

// Config is the type representation of the yaml config file.
type Config struct {
	Env string
	Src string
	Dst struct {
		WorksRoot  string `yaml:"works-root"`
		Categories string
		Relations  string
		Publishers string
		Meta       string
	}
	IsFrontMatter    bool                `yaml:"is-front-matter"`
	SkipLinksPattern string              `yaml:"skip-links-pattern"`
	LanguageAPIURL   string              `yaml:"language-api-url"`
	WorkMapping      []map[string]string `yaml:"work-mapping"`
}

// Translation represents a translation text query
// with its associated language code
type Translation struct {
	Query string
	Code  string
}

// CatalogID is an object containeing a numerical ID, a Name based on
// the catalog item's title and a GUID that merges Name and ID.
type CatalogID struct {
	ID    string
	NumID int `yaml:"num-id"`
	Name  string
	UUID  uuid.UUID
}

// NewCatalogID instantiates a CatalogID type
func NewCatalogID(title string, count int) CatalogID {
	name := strings.ToLower(sanitize.BaseName(title))
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

// Category represents a category a work belongs to.
type Category struct {
	CatalogID CatalogID `yaml:"catalog-id"`
	Title     string    `yaml:"title"`
}

// Publisher represents a publisher a work is published by.
type Publisher struct {
	CatalogID CatalogID         `yaml:"catalog-id"`
	Name      string            `yaml:"name"`
	Links     map[string]string `yaml:"links"`
}

// WorkTitle represents the title of a work with all it variations
// and translations
type WorkTitle struct {
	Main         string            `yaml:",omitempty"`
	Original     string            `yaml:",omitempty"`
	Sort         []string          `yaml:",omitempty"`
	Translations map[string]string `yaml:",omitempty"`
}

// NewWorkTitle instantiates a WorkTitle type
// based on a string input
func NewWorkTitle(title string) WorkTitle {
	titles := strings.Split(title, " / ")
	guessLanguage(titles)

	translationsMap := make(map[string]string)
	sort := make([]string, 0)
	var code string
	var main string

	for i, title := range titles {
		for _, translation := range translations {
			if title == translation.Query {
				code = translation.Code
				translationsMap[code] = translation.Query
				if i == 0 {
					main = code
				}
				break
			}
		}
		sort = append(sort, code)
	}

	original := "hu"

	if len(titles) == 1 {
		original = main
	}

	if _, ok := translationsMap["hu"]; !ok {
		original = main
	}

	return WorkTitle{
		Main:         main,
		Original:     original,
		Sort:         sort,
		Translations: translationsMap,
	}
}

// WorkDuration represents the duration of a work or movement in seconds
type WorkDuration int

// NewWorkDuration generates a WorkDuration expressed in seconds
// based on a string input
func NewWorkDuration(duration string) WorkDuration {
	return 0
}

// WorkMovement represents a work's movement
type WorkMovement struct {
	Title         WorkTitle     `yaml:",omitempty"`
	Duration      WorkDuration  `yaml:",omitempty"`
	Text          []WorkText    `yaml:",omitempty"`
	OriginalValue string        `yaml:"original-value,omitempty"`
	SubMovements  *WorkMovement `yaml:"sub-movements,omitempty"`
}

// CastMember represents a member of a stage work casting
type CastMember struct {
	Voice  string
	Figure string
}

// WorkText informs who wrote the text for which language for a work
type WorkText struct {
	Language string
	Author   string
}

// Work represents a work in the catalog.
type Work struct {
	CatalogID CatalogID `yaml:"catalog-id,omitempty"`
	// the date of the work last update
	Date  string
	Title WorkTitle
	// => only 1 instance of SubTitle in whole catalogue...
	SubTitle        string        `yaml:"sub-title,omitempty"`
	Version         string        `yaml:",omitempty"`
	Description     string        `yaml:",omitempty"`
	Duration        WorkDuration  `yaml:",omitempty"`
	CompositionDate string        `yaml:"composition-date,omitempty"`
	Movements       []interface{} `yaml:",omitempty"`
	Subject         string        `yaml:",omitempty"`
	Synopsis        string        `yaml:",omitempty"`
	Cast            []CastMember  `yaml:",omitempty"`
	Choreography    string        `yaml:",omitempty"` // => move in notes ?
	Text            []WorkText    `yaml:",omitempty"`
	Setting         string        `yaml:",omitempty"`
	Adaptation      string        `yaml:",omitempty"`
	// unclear what Reworking really means:
	// seems to be a list of references to other works
	// with the same title but other settings/versions
	Reworking string `yaml:",omitempty"`
	// Aren't Libretto and Text the same thing? Can't we merge them?
	Libretto []WorkText `yaml:",omitempty"`
	// Aren't Score and Source the same thing? Can't we merge them?
	Score         string `yaml:",omitempty"`
	Source        string `yaml:",omitempty"`
	Dedication    string `yaml:",omitempty"`
	WorldPremiere string `yaml:"world-premiere,omitempty"`
	NB            string `yaml:",omitempty"`
}

// WorkRelationType represents the type of relation a work can have with another entity
type WorkRelationType int

const (
	// InCategory defines a relation where a work belongs to a category
	InCategory WorkRelationType = iota
	// PublishedBy defines a relation where a work is published by a publisher
	PublishedBy
)

// Relations represent a map of relations by relation type
type Relations map[WorkRelationType]map[uuid.UUID][]uuid.UUID

func main() {
	// Clean dist directory
	cleanDist(config)

	doc := getHTMLDoc(config.Src)
	h1s := cascadia.MustCompile("h1").MatchAll(doc)
	categories := make([]Category, 0)
	// publishers := make(map[string]Publisher)
	relations := make(Relations)
	metas := make([]string, 1)
	works := make(map[string]Work)

	for _, titleNode := range h1s {
		tagText := getTagText(titleNode)
		categoryTitle := strings.Title(strings.ToLower(tagText))
		categoryID := NewCatalogID(categoryTitle, len(categories))
		category := Category{
			CatalogID: categoryID,
			Title:     categoryTitle,
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
				if title == "" {
					continue
				}

				workTitle := NewWorkTitle(title)

				workID := NewCatalogID(
					workTitle.Translations[workTitle.Main],
					len(works))

				work = Work{
					CatalogID: workID,
					Title:     workTitle,
					Date:      time.Now().Format("2006-01-02T15:04:05+00:00"),
				}

				if title != "" {
					works[work.CatalogID.ID] = work
					relations = addRelation(relations, InCategory, categoryID, workID)
				}
			case 2:
				keyText := getTagText(cols[0])
				key := sanitize.Name(strings.ToLower(keyText))
				value := getTagText(cols[1])

				if len(key) < 2 {
					key = "description"
				}

				if !listContainsString(metas, key) {
					metas = append(metas, key)
				}

				if work.CatalogID.ID != "" {
					w := works[work.CatalogID.ID]
					setWorkProperty(&w, key, value)
					works[work.CatalogID.ID] = w
				}

				// if work.Meta != nil {
				// 	work.Meta[key] = value

				// 	if key == "publication" {
				// 		// println("Publication", value)
				// 		// Add work in publisher
				// 		// relations = addRelation(relations, PublishedBy, , work.CatalogID)
				// 	}
				// }
			default:
				fmt.Println("->", work.CatalogID.ID, "row has more than 2 columns")
			}
		}
	}

	writeYamlFile(metas, config.Dst.Meta)
	writeYamlFile(categories, config.Dst.Categories)
	// writeYamlFile(publishers, config.Dst.Publishers)
	writeRelations(relations)
	writeWorks(works)
}

func listContainsString(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}

func loadEnv() Env {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	return Env{
		LanguageAPIKey: os.Getenv("LANGUAGE_API_KEY"),
	}
}

func loadConfig() Config {
	var config Config
	filename := "config.yaml"
	if len(os.Args) > 1 {
		filename = os.Args[1]
	}
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

func cleanDist(config Config) {
	os.RemoveAll(config.Dst.WorksRoot)
	os.RemoveAll(config.Dst.Relations)
	os.Remove(config.Dst.Categories)
	os.Remove(config.Dst.Publishers)
}

func loadTranslations() []Translation {
	var translations []Translation
	if _, err := os.Stat(translationsFile); os.IsNotExist(err) {
		os.Create(translationsFile)
	}

	source, err := ioutil.ReadFile(translationsFile)
	if err != nil {
		panic(err)
	}

	err = yaml.Unmarshal(source, &translations)
	if err != nil {
		panic(err)
	}

	return translations
}

func guessLanguage(queries []string) {
	toTranslate := make([]string, 0)

	for _, query := range queries {
		found := false
		for _, translation := range translations {
			if query == translation.Query {
				found = true
				break
			}
		}
		if !found {
			fmt.Println("-> translation not found:", query)
			toTranslate = append(toTranslate, query)
		}
	}

	if len(toTranslate) == 0 {
		return
	}

	body, err := json.Marshal(map[string][]string{
		"q": toTranslate,
	})
	if err != nil {
		fmt.Println(err)
	}

	request, err := http.NewRequest("POST", config.LanguageAPIURL, bytes.NewBuffer(body))
	if err != nil {
		fmt.Println(err)
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+env.LanguageAPIKey)

	client := &http.Client{}
	response, err := client.Do(request)
	if err != nil {
		log.Fatalln(err)
	}

	var result map[string]map[string][][]map[string]string

	json.NewDecoder(response.Body).Decode(&result)

	for i, detection := range result["data"]["detections"] {
		lang := detection[0]["language"]
		if lang == "fi" {
			lang = "hu"
		}
		translations = append(translations, Translation{
			Query: toTranslate[i],
			Code:  lang,
		})
	}

	writeYamlFile(translations, translationsFile)
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
	reStripTabsAndCR := regexp.MustCompile("(?mi)[\t\r\n]")
	reStripSpaces := regexp.MustCompile("(?mi)\\s+")
	reSkipLinks := regexp.MustCompile(config.SkipLinksPattern)

	buf := bytes.NewBufferString("")
	html.Render(buf, tag)

	str := buf.String()
	buf.Reset()

	// Format links in markdown format: [text](link)
	if strings.Contains(str, "href=\"") {
		anchorStr := ""
		anchors := cascadia.MustCompile("a[href]").MatchAll(tag)

		for _, anchor := range anchors {
			html.Render(buf, anchor)
			anchorStr = buf.String()
			href := ""
			text := sanitize.HTML(anchorStr)

			for _, attr := range anchor.Attr {
				if attr.Key == "href" {
					href = attr.Val
				}
			}

			// Skip unwanted links
			if reSkipLinks.MatchString(href) {
				continue
			}

			// Replace output string with formatted link
			md := fmt.Sprintf("[%s](%s)", text, href)
			str = strings.Replace(str, anchorStr, md, -1)
		}
	}

	// Remove HTML markup and clean unwanted chars
	str = sanitize.HTML(str)
	str = cleanString(str)

	// Remove tabs and carriage returns
	str = reStripTabsAndCR.ReplaceAllString(str, " ")

	// Remove duplicated spaces
	str = reStripSpaces.ReplaceAllString(str, " ")

	// Remove \0 char at start of some strings
	// Needed the prevent this kind of output: "\0 Vihar"
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

func getField(w *Work, field string) string {
	r := reflect.ValueOf(w)
	f := reflect.Indirect(r).FieldByName(field)
	return fmt.Sprintf("%v", f)
}

func setWorkProperty(work *Work, key string, value string) {
	prop := ""

	for _, mapping := range config.WorkMapping {
		for k, v := range mapping {
			re := regexp.MustCompile(v)
			if re.MatchString(key) {
				prop = k
			}
		}
	}

	println("prop", prop)

	switch prop {
	case "":
		work.Description = value // write description and version based on value containing `for:` or not
	case "duration":
		work.Duration = NewWorkDuration(value)
	case "composition-date":
		work.CompositionDate = value
	case "movements":
		work.Movements = getWorkMovements(value)
	case "setting":
		work.Setting = value
	case "subject":
		work.Subject = value
	case "synopsis":
		work.Synopsis = value
	case "cast":
		work.Cast = getCastMembers(value)
	case "choreography":
		work.Choreography = value
	case "text":
		work.Text = getWorkText(value)
	case "adaptation":
		work.Adaptation = value
	case "reworking":
		work.Reworking = value
	case "libretto":
		work.Libretto = getWorkText(value)
	case "score":
		work.Score = value
	case "source":
		work.Source = value
	case "world-premiere":
		work.WorldPremiere = value
	case "dedication":
		work.Dedication = value
	case "nb":
		work.NB = value
	}
}

func getWorkMovements(content string) []interface{} {
	var movements []interface{}
	// partRe := regexp.MustCompile(`(?imU)(\d{1,2}([a-z])?\s*\)\s+)(.*)`)

	// if !partRe.MatchString(content) {
	movements = append(movements, WorkMovement{
		OriginalValue: content,
	})

	// } else {
	// 	list := make([]interface{}, 0)

	// 	for _, match := range partRe.FindAllStringSubmatch(content, -1) {
	// 		if match[2] != "" {
	// 			// sub movement: 1a), 1b), ...
	// 			index := len(list) - 1
	// 			list[index]

	// 			// if list[index] == nil {
	// 			// 	list[index] := []string{}
	// 			// }

	// 			// list[index] = append(list[index], match[2])
	// 		} else {
	// 			// movement: 1), 2), ...
	// 			list = append(list, match[1])
	// 		}
	// 	}
	// 	content = partRe.ReplaceAllStringFunc(content, func(match string) string {
	// 		fmt.Println(match)
	// 		return "\n"
	// 	})

	// 	fmt.Println("-> c: ", content)
	// }

	return movements
}

func getCastMembers(content string) []CastMember {
	return make([]CastMember, 0)
}

func getWorkText(content string) []WorkText {
	return make([]WorkText, 0)
}

func addRelation(relations Relations, relType WorkRelationType, containerID CatalogID, workID CatalogID) Relations {
	// Init relations with relation type
	if _, ok := relations[relType]; !ok {
		relations[relType] = map[uuid.UUID][]uuid.UUID{
			containerID.UUID: make([]uuid.UUID, 0),
		}
	}

	// Init relation
	if _, ok := relations[InCategory][containerID.UUID]; !ok {
		relations[InCategory][containerID.UUID] = make([]uuid.UUID, 0)
	}

	// Push work
	relations[InCategory][containerID.UUID] =
		append(relations[InCategory][containerID.UUID], workID.UUID)

	return relations
}

func writeWorks(works map[string]Work) {
	for _, work := range works {
		writeWork(work)
	}
}

func writeWork(work Work) error {
	marshal, err := yaml.Marshal(work)
	if err != nil {
		return errors.New("Could not marshal work '" + work.CatalogID.ID + "' to yaml format.")
	}

	file := filepath.FromSlash(config.Dst.WorksRoot + "/" + work.CatalogID.ID + ".yaml")

	if config.IsFrontMatter {
		dash := "-"[0]
		dashes := []byte{dash, dash, dash}
		marshal = append(append(dashes, "\n"[0]), marshal...)
		marshal = append(marshal, dashes...)
		file = strings.Replace(file, ".yaml", ".md", 1)
	}

	err = writeFile(file, marshal)
	if err != nil {
		return err
	}

	return nil
}

func writeRelations(relations Relations) {
	for k, v := range relations {
		fileName := ""
		switch k {
		case InCategory:
			fileName = filepath.Base(config.Dst.Categories)
		case PublishedBy:
			fileName = filepath.Base(config.Dst.Publishers)
		}

		if fileName != "" {
			writeYamlFile(v, filepath.Join(config.Dst.Relations, fileName))
		}
	}
}

func writeYamlFile(content interface{}, file string) {
	marshal, err := yaml.Marshal(content)
	if err != nil {
		panic(err)
	}

	err = writeFile(file, marshal)
	if err != nil {
		panic(err)
	}
}

func writeFile(file string, content []byte) error {
	_, fileName, _, _ := runtime.Caller(1)
	filePath := path.Join(path.Dir(fileName), filepath.Dir(file))

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		os.MkdirAll(filePath, 0755)
	}

	if err := ioutil.WriteFile(file, content, 0644); err != nil {
		return err
	}

	return nil
}
