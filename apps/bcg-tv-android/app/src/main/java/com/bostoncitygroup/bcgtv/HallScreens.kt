package com.bostoncitygroup.bcgtv

object HallScreens {
    data class Screen(val num: Int, val label: String, val hint: String) {
        fun display(): String = "$num — $label · $hint"
    }

    val all: List<Screen> = listOf(
        Screen(1, "USA", "Semp 65S62 · canto bar direita"),
        Screen(2, "Colômbia", "Semp 55S62 · diagonal bar direita"),
        Screen(3, "Paraguai", "Semp 65S62 · direita palco"),
        Screen(4, "Uruguai", "Semp 65S62 · direita tela palco"),
        Screen(5, "Equador", "Semp 65S62 · esquerda tela palco"),
        Screen(6, "Canadá", "Semp 55S62 · esquerda palco"),
        Screen(7, "Alemanha", "Semp 65S62 · diagonal bar esquerda"),
        Screen(8, "Áustria", "Semp 55S62 · canto bar esquerda"),
        Screen(9, "Bélgica", "Semp 65S62 · meio bar esquerda"),
        Screen(10, "Inglaterra", "Samsung Tizen · canto upper deck"),
        Screen(11, "Noruega", "Semp 55S62 · meio upper deck"),
        Screen(12, "Portugal", "Semp 55S62 · banheiro upper deck"),
        Screen(13, "Croácia", "Philips 7300 · upper deck TV1"),
        Screen(14, "Escócia", "Philips 7300 · upper deck TV2"),
        Screen(15, "Espanha", "Philips 7300 · upper deck TV3"),
        Screen(16, "França", "Philips 7300 · upper deck TV4"),
        Screen(17, "Holanda", "Semp 55S62 · centro upper deck"),
        Screen(18, "Argentina", "Semp 55S62 · banheiro bar direita"),
        Screen(19, "Suécia", "Semp 55S62 · meio upper deck bar direita"),
        Screen(20, "Suíça", "Semp 65S62 · canto upper deck bar direita"),
        Screen(21, "Telão Brasil", "Telão · HDMI processador"),
    )
}
